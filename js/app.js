if (typeof app === 'undefined' || !app) {
  var app = {};
}

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
    this.shareView = new app.ShareView({});
    this.model.on('change:candidate', this.setYear, this);
    this.model.on('change:candidate', this.showShare, this);
    this.model.on('change:mapName', this.renderCandidateView, this);

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

    // if year was provided on initalization, which is the case for sharable links
    var year = this.model.get('yearSelect').get('year');
    if(this.model.get('candidate')) { this.renderCandidateView(year); }

    return this;
  },

  renderCandidateView: function(selectedYear) {
    this.$el.find('.details').slideDown();
    
    var year = this.model.get('yearSelect').get('year');

    if(this.model.changed.candidate) {
      var mostRecentYear = this.model.get('candidate').getMostRecentYear();
      year = typeof selectedYear === 'string' ? selectedYear : mostRecentYear;
      this.model.get('yearSelect').set('year', Number(year));
      this.redrawYear();
    }

    this.candidateView = new app.CandidateView({
      model: this.model.get('candidate'),
      mapName: this.model.get('mapName')
    });

    this.$el.find('.candidate').html(this.candidateView.render(year).el);
  },

  selectCandidate: function(e) {
    var slug = this.$el.find(':selected').val();
    this.model.set('candidate', this.model.get('candidates').findWhere({ slug: slug }));
    this.model.get('candidate').on('sync', this.renderCandidateView, this);
    this.model.get('candidate').fetch();
  },

  selectMap: function(e) {
    event.preventDefault();
    var mapName = $(e.target).data('mapname');
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
    this.$el.find('.candidate').html(this.candidateView.render(this.model.get('yearSelect').get('year')).el);
  },

  showShare: function() {
    this.$el.find('.share').addClass('active');
  },

  share: function() {
    event.preventDefault();

    var slug = '#' + this.model.get('candidate').get('initials') + '-' + this.model.get('yearSelect').get('year');

    $('#shareModal').find('.link').html(location.origin + slug);
    $('#shareModal').foundation('reveal', 'open');
  }
});

app.CandidateSelectView = app.BaseView.extend({
  tagName: 'select',

  attributes: {
    'data-placeholder': 'Select a candidate'
  },

  render: function() {
    // Insert a blank option first so we can have a placeholder value
    this.$el.append('<option></option>');

    if(this.options.active) {
      var selectedSlug = this.options.active;
    }

    this.collection.each(function(candidate) {
      if(candidate.get('slug') === selectedSlug) {
        this.$el.append(new app.SelectItemView({ model: candidate, active: true }).render().el);
      } else {
        this.$el.append(new app.SelectItemView({ model: candidate }).render().el);
      }
    }, this);

    return this;
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

app.CandidateView = app.BaseView.extend({
  tagName: 'div',
  className: 'twelve columns',

  events: {
    'click .close a': 'close'
  },

  initialize: function() {
    this.template = _.template($('#candidate-view-template').html());
    this.model.on('change', this.render, this);
  },

  render: function(year) {
    this.$el.html(this.template($.extend({}, this.model.toJSON(), { year: year })));

    var map = app.maps.findWhere({ name: this.options.mapName });

    var that = this;

    if(!map.get('topo')) {
      map.getTopo(function() {
        that.mapView = new app.MapView({ model: map, candidate: that.model });
        that.$el.find('.map-container').html(that.mapView.render(year).el);
      });
    } else {
      that.mapView = new app.MapView({ model: map, candidate: that.model });
      that.$el.find('.map-container').html(that.mapView.render(year).el);
    }

    return this;
  }
});

app.MapView = app.BaseView.extend({
  initialize: function() {
    this.margin = { top: 10, left: 10, bottom: 10, right: 10 };
    this.width = parseInt(d3.select('.map-container').style('width'), 0.0);
    this.width = this.width - this.margin.left - this.margin.right;
    this.mapRatio = 0.85;
    this.height = this.width * this.mapRatio;

    this.projection = d3.geo.mercator()
          .center(this.model.get('center'))
          .scale(this.width * this.model.get('scale'))
          .translate([this.width / 2, this.height / 2]);
    
    this.path = d3.geo.path()
          .projection(this.projection);

    var that = this;
    d3.select(window).on('resize', function() { that.resize(that); });
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

  render: function(year) {
    this.$el.empty();

    var data = this.options.candidate.get('contributions')[year] ? this.options.candidate.get('contributions')[year][this.model.get('geography')] : {},
        max = _.max(data);

    if(this.model.get('name') === 'state') {
      var fData = d3.map();

      _.each(data, function(value, i) {
        fData.set(i.toUpperCase(), value);
      });

      data = fData;
    }

    var quantize = d3.scale.quantize()
      .domain([0, max])
      .range(d3.range(5).map(function(i) { return "break" + i; }));

    this.svg = d3.select(this.el).append('svg')
          .attr('width', this.width)
          .attr('height', this.height);

    var topo = this.model.get('topo');
    var that = this;

    this.svg.append("g")
      .selectAll("path")
        .data(topojson.feature(topo, topo.objects[this.model.get('topo-objects')]).features)
      .enter().append("path")
        .attr("d", this.path)
        .attr("class", function(d) { return 'region ' + quantize(data[d.id]); })
        .attr("data-slug", this.options.candidate.get('slug'))
        .attr("data-year", year)
        .attr("data-location", function(d) { return d.id.toLowerCase(); })
        .on("click", function() {
          that.getContributions(this, function(contributions) {
            app.contributions = new app.Contributions(contributions);
            app.contributionView = new app.ContributionView({ collection: app.contributions });
          });
        });

    _.each(this.model.get('meshes'), function(mesh) {
      this.svg.append("g")
        .append("path")
          .datum(topojson.mesh(topo, topo.objects[mesh], function(a, b) { return a !== b; }))
          .attr("d", this.path)
          .attr("class", "boundary");
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

    return this;
  }
});

app.ContributionView = app.BaseView.extend({
  tagName: 'table',

  initialize: function() {
    this.template = _.template($('#contribution-view-template').html());
    $('.contributions').html(this.render().el);
  },

  render: function() {
    var items = this.collection.format().map(function(c) {
      return (this.template(c.attributes));
    }, this);

    this.$el.append(items);
    return this;
  }
});

app.ShareView = app.BaseView.extend({
  events: {
    'click #share-custom': 'shareCustom'
  },

  // Generate sharable link based on active panels
  shareCustom: function(event) {
    event.preventDefault();
    var candidateList = [];

    $('.candidates').children().each(function(index, candidate){
      var $panel = $(candidate),
          initials = $panel.find('.panel-header').data('initials'),
          year = $panel.find('.year').text();

      candidateList.push(initials + '-' + year);
    });

    var urlHash = _.reduce(candidateList, function(memo, candidate){
      return memo + candidate + ',';
    }, '');

    location.hash = '';
    location.hash = urlHash;
    $('#shareModal').find('.link').html(location.origin + location.hash);
    $('#shareModal').foundation('reveal', 'open');
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
        var initials = candidate.split('-')[0],
            year = candidate.split('-')[1],
            model = app.candidates.find(function(c) { return c.get('initials') == initials; });

        if (model) {
          model.fetch({
            dataType: 'json',
            success: function(model) {
              app.panels = new app.Panels(new app.Panel({
                candidate: model,
                candidates: app.candidates,
                yearSelect: new app.YearSelect({ year: year })
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