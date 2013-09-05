if (typeof app === 'undefined' || !app) {
  var app = {};
}

app.showTooltip =  function(donationTotal, countyName) {
  // var contents = app.getContents(hourId),
  //     $hourPos = $('#' + hourId).offset();

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  if ($('#tooltip').length) {
      $('#tooltip').html('<div id="county-name">'+countyName+'</div><div id="donation-total">$'+donationTotal+'</div>').show();
      console.log("ONE");
    } else {
      console.log("TWO");
      $('<div/>', {
        'id': 'tooltip',
        html: '<div id="county-name">'+countyName+'</div><div id="donation-total">$'+donationTotal+'</div>'
      }).appendTo('#app-container').show();
    }

  // var offset = $('#chart').offset();
  console.log(donationTotal);
};

app.hideTooltip = function() {
  $('#tooltip').hide();
  $(document).unbind('mousemove');
};

app.Candidate = Backbone.Model.extend({
  url: function() {
    return 'data/' + this.get('slug') + '.json';
  },

  getMostRecentYear: function() {
    var max = _.max(_.keys(this.get('contributions')));
    return max;
  }
});

app.Candidates = Backbone.Collection.extend({
  model: app.Candidate
});

app.YearSelect = Backbone.Model.extend({
  defaults: {
    forward: false,
    backward: true,
    year: 2012
  },

  validateYear: function(candidate) {
    if (!candidate.get('contributions')[this.get('year') + 1] || this.get('year') + 1 == 2013) {
      this.set('forward', false);
    } else {
      this.set('forward', true);
    }

    if (!candidate.get('contributions')[this.get('year') - 1]) {
      this.set('backward', false);
    } else {
      this.set('backward', true);
    }
  },

  validateDirection: function(candidate, direction) {
    if (direction === 'forward') {
      this.set('year', this.get('year') + 1);
    } else {
      this.set('year', this.get('year') - 1);
    }

    this.set('forward', true);
    this.set('backward', true);

    if (!candidate.get('contributions')[this.get('year') + 1] || this.get('year') + 1 == 2013) {
      this.set('forward', false);
    }

    if (!candidate.get('contributions')[this.get('year') - 1]) {
      this.set('backward', false);
    }
  }
});

app.Contribution = Backbone.Model.extend({});

app.Contributions = Backbone.Collection.extend({
  model: app.Contribution,
  comparator: function(item) {
    return -item.get('amount');
  },

  format: function() {
    this.formatDate();
    this.formatMoney();

    return this;
  },

  formatDate: function() {
    this.each(function(contribution) {
      var fDate = moment(contribution.get('date')).format('MM/DD/YYYY');
      contribution.set('fDate', fDate);
    });
  },

  formatMoney: function() {
    this.each(function(contribution) {
      contribution.set('fAmount', Number(contribution.get('amount')).formatMoney());
    });
  }
});

app.Map = Backbone.Model.extend({
  getTopo: function(callback) {
    var that = this;
    d3.json(this.get('topo-url'), function(data){
      that.set('topo', data);
      callback();
    });
  }
});

app.Maps = Backbone.Collection.extend({
  model: app.Map
});

app.Panel = Backbone.Model.extend({});

app.Panels = Backbone.Collection.extend({
  model: app.Panel
});

app.BaseView = Backbone.View.extend({
  initialize: function(options){
    Backbone.View.prototype.initialize.apply(this, arguments);
  },

  getContributions: function(element, callback) {
    var attributes = this.extractAttributes(element),
        url = this.constructUrl(attributes);

    $.ajax({
      url: url,
      success: function(resp){
        if(callback && typeof callback === 'function') {
          callback(resp);
        }
      }
    });
  },

  constructUrl: function(a) {
    var baseUrl = 'http://cf-contributions.axisphilly.org/contribution';
    
    return baseUrl + '/' + a.slug + '/' + a.year + '/' + a.location;
  },

  extractAttributes: function(element) {
    var $element = $(element);

    return {
      slug: $element.data('slug'),
      year: $element.data('year'),
      location: $element.data('location')
    };
  }
});

app.PanelView = app.BaseView.extend({
  tagName: 'div',
  className: 'panel-view',

  events: {
    'change select': 'selectCandidate',
    'click .forward': 'updateYear',
    'click .backward': 'updateYear',
    'click .share': 'share',
    'click .map-select li': 'selectMap'
  },

  initialize: function() {
    this.template = _.template($('#panel-view-template').html());
    this.yearSelectView = new app.YearSelectView({ model: this.model.get('yearSelect') });
    this.model.on('change:candidate', this.setYear, this);
    this.model.on('change:mapName', this.renderMapView, this);

    var selected;
    if (this.model.get('candidate')) {
      selected = this.model.get('candidate').get('slug');
    }

    this.candidateSelectView = new app.CandidateSelectView({
      collection: this.model.get('candidates'),
      active: selected
    });
  },

  render: function() {
    this.$el.html(this.template({}));

    this.$el.find('.candidate-select-view')
      .append(this.candidateSelectView.render().el)
      .find('select')
      .chosen({ disable_search_threshold: 15 });

    if(this.model.get('mapName')) {
      var map = this.model.get('mapName');
      this.$el.find('.map-select .' + map).addClass('active');
    }

    // if year was provided on initalization, which is the case for sharable links
    var year = this.model.get('yearSelect').get('year');
    if(this.model.get('candidate')) { this.renderMapView(year); }

    return this;
  },

  renderMapView: function(selectedYear) {
    this.$el.find('.details').slideDown();
    
    var year = this.model.get('yearSelect').get('year');

    if(this.model.changed.candidate) {
      var mostRecentYear = this.model.get('candidate').getMostRecentYear();
      year = typeof selectedYear === 'string' ? selectedYear : mostRecentYear;
      this.model.get('yearSelect').set('year', Number(year));
    }

    var that = this;
    var map = app.maps.findWhere({ name: that.model.get('mapName') });

    if(!map.get('topo')) {
      map.getTopo(function() {
        that.mapView = new app.MapView({ model: map, candidate: that.model.get('candidate'), el: '.map-view' });
        that.mapView.render(year);
      });
    } else {
      that.mapView = new app.MapView({ model: map, candidate: that.model.get('candidate'), el: '.map-view' });
      that.mapView.render(year);
    }

    this.redrawYear();

    return this;
  },

  selectCandidate: function(event) {
    var slug = this.$el.find(':selected').val();
    this.model.set('candidate', this.model.get('candidates').findWhere({ slug: slug }));
    this.model.get('candidate').on('sync', this.renderMapView, this);
    this.model.get('candidate').fetch();
    if(app.contributionView) { app.contributionView.reset(); }
    this.$el.find('.candidate').addClass('loading');
  },

  selectMap: function(event) {
    event.preventDefault();
    $('.active').removeClass('active');
    $(event.target).addClass('active');
    var mapName = $(event.target).data('mapname');
    this.model.set('mapName', mapName);
  },

  redrawYear: function() {
    this.model.get('yearSelect').validateYear(this.model.get('candidate'));
    this.$el.find('.year-select-view').html(this.yearSelectView.render().el);
  },

  setYear: function() {
    this.$el.find('.year-select-view').html(this.yearSelectView.render().el);
  },

  updateYear: function(event) {
    event.stopPropagation();

    if(!$(event.target).data('status')) { return; }

    var direction = $(event.target).data('direction');
    this.model.get('yearSelect').validateDirection(this.model.get('candidate'), direction);
    this.mapView.render(this.model.get('yearSelect').get('year'));
  },

  showShare: function() {
    this.$el.find('.share').addClass('active');
  },

  share: function(event) {
    event.preventDefault();

    var slug = '#' + this.model.get('candidate').get('initials') +
               '-' + this.model.get('yearSelect').get('year') +
               '-' + this.model.get('mapName');

    $('#shareModal').find('.link').html(location.origin + slug);
    $('#shareModal').foundation('reveal', 'open');
  }
});

app.CandidateSelectView = app.BaseView.extend({
  tagName: 'div',

  initialize: function() {
    this.template = _.template($('#candidate-select-view-template').html());
  },

  events: {
    'change': 'renderTitle'
  },

  render: function() {
    if(this.options.active) {
      var selectedSlug = this.options.active;
    }

    this.$el.html(this.template({}));

    this.collection.each(function(candidate) {
      if(candidate.get('slug') === selectedSlug) {
        this.$el.find('select').append(new app.SelectItemView({ model: candidate, active: true }).render().el);
        this.$el.find('.title').html(candidate.get('title'));
      } else {
        this.$el.find('select').append(new app.SelectItemView({ model: candidate }).render().el);
      }
    }, this);

    return this;
  },

  renderTitle: function(event) {
    var slug = $(event.target).val(),
        candidate = app.candidates.findWhere({ slug: slug });
    
    this.$el.find('.title').html(candidate.get('title'));
  }
});

app.SelectItemView = app.BaseView.extend({
  tagName: 'option',

  attributes: function() {
    return {
      'selected': this.options.active
    };
  },

  render: function() {
    this.$el.html(this.model.get('name')).val(this.model.get('slug'));

    return this;
  }
});

app.YearSelectView = app.BaseView.extend({
  initialize: function() {
    this.template = _.template($('#year-select-view-template').html());
    this.model.on('change', this.render, this);
  },

  render: function() {
    this.$el.html(this.template(this.model.attributes));
    return this;
  }
});

app.MapView = app.BaseView.extend({
  tagName: 'div',
  className: 'map twelve columns',

  initialize: function() {
    this.margin = { top: 10, left: 10, bottom: 10, right: 10 };
    this.width = parseInt(d3.select('.map-container').style('width'), 0.0);
    this.width = this.width - this.margin.left - this.margin.right;
    this.mapRatio = this.model.get('ratio');
    this.height = this.width * this.mapRatio;

    this.projection = d3.geo.mercator()
          .center(this.model.get('center'))
          .scale(this.width * this.model.get('scale'))
          .translate([this.width / 2, this.height / 2]);
    
    this.path = d3.geo.path()
          .projection(this.projection);

    this.colors = ["#eee", "orange"];

    var that = this;
    d3.select(window).on('resize', function() { that.resize(that); });

    this.model.on('change', this.render, this);
  },

  render: function(year) {
    this
      .renderMap(year)
      .renderLegend()
      .renderTitle();

    return this;
  },

  renderMap: function(year) {
    this.$el.find('.map-container').empty();

    var data = this.options.candidate.get('contributions')[year] ? this.options.candidate.get('contributions')[year][this.model.get('geography')] : {};

    if(this.model.get('name') === 'state') {
      var fData = d3.map();

      _.each(data, function(value, i) {
        fData.set(i.toUpperCase(), value);
      });

      data = fData;
    }

    this.data = data;
    this.total = _.reduce(_.values(data), function(memo, num){ return memo + num; }, 0);
    this.scale = this.createScale(data);

    this.svg = d3.select(this.el).select('.map-container').append('svg')
          .attr('width', this.width)
          .attr('height', this.height);

    var topo = this.model.get('topo');
    var that = this;

    this.svg.append("g")
      .selectAll("path")
        .data(topojson.feature(topo, topo.objects[this.model.get('topo-objects')]).features)
      .enter().append("path")
        .attr("d", this.path)





        .attr("class", function(d) {
          var className = 'region';
          if (data[d.id] && that.model.get('disabled') !== d.id) {
            className = className + ' active';
          }
          return className;
        })
        .style("fill", function(d) {
          if (that.model.get('disabled') === d.id) {
            return 'url(#cross-hatch)';
          }
          return that.scale(data[d.id]);
        })
        .attr("data-slug", this.options.candidate.get('slug'))
        .attr("data-year", year)
        .attr("data-location", function(d) { return d.id.toLowerCase(); })
        .on("click", function() {
          if(d3.select(this).classed('active')) {
            $('.contributions .table-container').addClass('loading');
            that.getContributions(this, function(contributions) {
              app.contributions = new app.Contributions(contributions);
              app.contributionView = new app.ContributionView({ collection: app.contributions });
            });
          }
        })
        .on('mouseover', function(d) {
          if(d3.select(this).classed('active')) {
            app.showTooltip(data[d.id], d.id);
            var posX = d3.event.pageX + 25 + "px";
                posY = d3.event.pageY - 4 + "px";
                $('#tooltip').css({ left: posX, top: posY });
            d3.select(this).classed("selected", true);
          }
          else {
            app.hideTooltip();
          }
        });
    _.each(this.model.get('meshes'), function(mesh) {
      this.svg.append("g")
        .append("path")
          .datum(topojson.mesh(topo, topo.objects[mesh], function(a, b) { return a; }))
          .attr("d", this.path)
          .attr("class", function(d) {
            var className = "boundary";
            if(that.model.get('name') === 'region' && mesh === 'counties') {
              className = className + ' county';
            }
            return className;
          });
    }, this);

    // Add district outline if councilperson is a district councilperson
    if(this.options.candidate.get('district') && this.model.get('name') === 'city') {
      var distNum = this.options.candidate.get('district');
      this.svg.append("g")
        .selectAll("path")
          .data(function() {
            // We only want to draw the district of the selected councilperson
            var active = { type: "GeometryCollection", geometries: [] };
            for(var i=0; i<topo.objects.districts.geometries.length; i++) {
              if(topo.objects.districts.geometries[i].id == distNum) {
                active.geometries.push(topo.objects.districts.geometries[i]);
              }
            }
            return topojson.feature(topo, active).features;
          })
        .enter().append('path')
          .attr('d', this.path)
          .attr('class', 'district');
    }

    //patterns
    this.svg
      .append('defs')
      .append('pattern')
        .attr("id", "cross-hatch")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10)
      .append('g')
        .attr('style', "fill:none; stroke:#ddd; stroke-width:1");

    this.svg.select('defs').select('pattern').select('g')
      .append('path')
        .attr('d', "M0,0 l10,10");
    this.svg.select('defs').select('pattern').select('g')
      .append('path')
        .attr('d', "M10,0 l-10,10");

    return this;
  },

  renderLegend: function(data) {
    // http://bl.ocks.org/mbostock/3014589 + parts of http://bl.ocks.org/mbostock/5144735

    this.$el.find('.map-legend').empty();

    var interpolators = {
      "RGB": d3.interpolateRgb
    };

    var width = 200,
        height = '100%';

    var y = d3.scale.ordinal()
        .domain(d3.keys(interpolators))
        .rangeRoundBands([0, 10], 0.1);

    var values = d3.range(200 - 28);

    var x = d3.scale.ordinal()
        .domain(values)
        .rangeRoundBands([14, width - 14]);

    var color = d3.scale.linear()
        .domain([0, values.length - 1])
        .range(this.colors);

    var svg = d3.select(".map-legend").append("svg")
        .attr("width", width)
        .attr("height", height);

    var g = svg.selectAll("g")
        .data(d3.entries(interpolators))
      .enter().append("g")
        .attr("transform", function(d) { return "translate(0, 20)"; });

    g.each(function(d) {
      color.interpolate(d.value);

      d3.select(this).selectAll("rect")
        .data(values)
      .enter().append("rect")
        .attr("x", x)
        .attr("width", x.rangeBand())
        .attr("height", y.rangeBand)
        .style("fill", color);
    });

    g.append("text")
        .attr("class", "caption")
        .attr("y", -6)
        .attr("x", 15)
        .text("Total Contribution Amount");

    g.append("text")
        .attr("class", "caption")
        .attr("y", 30)
        .attr("x", 7)
        .text("$0");

    g.append("text")
        .attr("class", "caption")
        .attr("y", 30)
        .attr("x", 160)
        .text("$" + this.scale.domain()[1].formatMoney());

    g.append("svg:line")
        .attr("x2", 0)
        .attr("y2", 15)
        .attr("dy", ".71em")
        .attr("transform", "translate(15, 0)");

    g.append("svg:line")
        .attr("x2", 0)
        .attr("y2", 15)
        .attr("dy", ".71em")
        .attr("transform", "translate(185, 0)");

    return this;
  },

  renderTitle: function() {
    this.$el.find('.map-title').empty();

    this.title = d3.select(this.el).select('.map-title')
      .append('h3')
        .text(this.model.get('title'));

    this.show_total = d3.select(this.el).select('.map-title')
      .append('span')
        .text('Total: $' + (Math.round(this.total / 100) * 100).formatMoney());

    return this;
  },

  createScale: function(data) {
    data = _.omit(data, this.model.get('disabled'));

    var scale = d3.scale.linear()
      .domain([0, _.max(data)])
      .range(this.colors);

    return scale;
  },

  resize: function(view) {
    // thanks http://eyeseast.github.io/visible-data/2013/08/26/responsive-d3/
    view.width = parseInt(d3.select('.map-container').style('width'), 0.0);
    view.width = view.width - view.margin.left - view.margin.right;
    view.height = view.width * view.mapRatio;

    view.projection
        .translate([view.width / 2, view.height / 2])
        .scale(view.width * view.model.get('scale'));

    view.svg
        .style('width', view.width + 'px')
        .style('height', view.height + 'px');

    view.svg.selectAll('.region').attr('d', view.path);
    view.svg.selectAll('.boundary').attr('d', view.path);
    view.svg.selectAll('.district').attr('d', view.path);
  },
});

app.ContributionView = app.BaseView.extend({
  tagName: 'table',

  initialize: function() {
    this.template = _.template($('#contribution-view-template').html());
    $('.contributions .table-container').html(this.render().el);
  },

  render: function() {
    var items = this.collection.format().map(function(c) {
      return (this.template(c.attributes));
    }, this);

    this.$el.append(items);

    $('.contributions .table-container').removeClass('loading');

    return this;
  },

  reset: function() {
    $('.contributions .table-container').html('<span class="placeholder">' +
      'Click a region to show contributions from that region for the selected' +
      ' councilperson and year.</span>');
  }
});

app.Router = Backbone.Router.extend({
  initialize: function() {
    d3.json('data/candidates.json', function(data){
      app.candidates = new app.Candidates(data);

      d3.json('data/maps.json', function(data){
        app.maps = new app.Maps(data);

        Backbone.history.start({ pushState:false, silent:false });
      });
    });

    _.templateSettings = {
      evaluate: /\{\{(.+?)\}\}/g,
      interpolate: /\{\{=(.+?)\}\}/g
    };
  },

  routes: {
    '': 'index',
    ':candidates': 'index'
  },

  index: function(candidates) {
    if (candidates) {
      var candidateList = candidates.split(',');

      _.each(candidateList, function(candidate) {
        var parts = candidate.split('-'),
            initials = parts[0],
            year = parts[1],
            map = parts[2],
            model = app.candidates.find(function(c) { return c.get('initials') == initials; });

        if (model) {
          model.fetch({
            dataType: 'json',
            success: function(model) {
              app.panels = new app.Panels(new app.Panel({
                candidate: model,
                candidates: app.candidates,
                yearSelect: new app.YearSelect({ year: year }),
                mapName: map
              }));

              $('#app-container').append(new app.PanelView({ model: app.panels.at(0) }).render().el);
            },
            error: function(model, resp) {
              console.log('fail');
            }
          });
        }
      });
    } else {
      app.panels = new app.Panels(new app.Panel({
        candidates: app.candidates,
        yearSelect: new app.YearSelect({ year: 2012 }),
        mapName: 'city'
      }));

      $('#app-container').append(new app.PanelView({ model: app.panels.at(0) }).render().el);
    }
  }
});

// go!
app.router = new app.Router();

Number.prototype.formatMoney = function(){
  var cV=0, dV='.', tV=',';
  var n = this, c = isNaN(cV = Math.abs(cV)) ? 2 : cV, d = dV === undefined ? "," : dV, t = tV === undefined ? "." : tV, s = n < 0 ? "-" : "", i = parseInt(n = Math.abs(+n || 0).toFixed(c), 10) + "", j = (j = i.length) > 3 ? j % 3 : 0;
  return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};