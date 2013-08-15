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

app.contributions = Backbone.Collection.extend({
  model: app.Contribution
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
    var baseUrl = 'http://localhost:3000/contribution';
    
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
  },

  initialize: function() {
    this.template = _.template($('#panel-view-template').html());
    this.yearSelectView = new app.YearSelectView({ model: this.model.get('yearSelect') });
    this.shareView = new app.ShareView({});
    this.model.on('change:candidate', this.setYear, this);
    this.model.on('change:candidate', this.showShare, this);

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
    var mostRecentYear = this.model.get('candidate').getMostRecentYear();
    var year = typeof selectedYear === 'string' ? selectedYear : mostRecentYear;

    this.model.get('yearSelect').set('year', Number(year));
    this.redrawYear();

    this.candidateView = new app.CandidateView({
      model: this.model.get('candidate')
    });

    this.$el.find('.candidate').html(this.candidateView.render(year).el);
  },

  selectCandidate: function(e) {
    var slug = this.$el.find(':selected').val();
    this.model.set('candidate', this.model.get('candidates').findWhere({ slug: slug }));
    this.model.get('candidate').on('sync', this.renderCandidateView, this);
    this.model.get('candidate').fetch();
  },

  redrawYear: function() {
    this.model.get('yearSelect').validateYear(this.model.get('candidate'));
    this.$el.find('.year-select-view').html(this.yearSelectView.render().el);
  },

  setYear: function() {
    this.$el.find('.year-select-view').html(this.yearSelectView.render().el);
  },

  showShare: function() {
    this.$el.find('.share').addClass('active');
  },

  updateYear: function(event) {
    event.stopPropagation();

    if(!$(event.target).data('status')) { return; }

    var direction = $(event.target).data('direction');
    this.model.get('yearSelect').validateDirection(this.model.get('candidate'), direction);
    this.$el.find('.candidate').html(this.candidateView.render(this.model.get('yearSelect').get('year')).el);
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
    this.cityView = new app.CityView({ model: this.model });
    this.stateView = new app.StateView({ model: this.model });
    this.nationalView = new app.NationalView({ model: this.model });
    this.model.on('change', this.render, this);
  },

  render: function(year) {
    this.$el.html(this.template($.extend({}, this.model.toJSON(), { year: year })));
    this.$el.find('.city').html(this.cityView.render(year).el);
    this.$el.find('.state').html(this.stateView.render(year).el);
    this.$el.find('.national').html(this.nationalView.render(year).el);

    return this;
  },

  close: function() {
    this.$el.children().fadeOut(300);
    this.$el.slideUp(function(){
      this.remove();
    });
  }
});

app.CityView = app.BaseView.extend({
  initialize: function() {
    this.width = 360;
    this.height = 429;
    this.projection = d3.geo.mercator()
          .center([-75.1182, 40.0032])
          .scale(64000)
          .translate([this.width / 2, this.height / 2]);
    this.path = d3.geo.path()
          .projection(this.projection);
  },

  render: function(year) {
    this.$el.empty();

    var data = this.model.get('contributions')[year] ? this.model.get('contributions')[year]['ward'] : {},
        max = _.max(data);

    var quantize = d3.scale.quantize()
      .domain([0, max])
      .range(d3.range(5).map(function(i) { return "break" + i; }));

    var svg = d3.select(this.el).append('svg')
          .attr('width', this.width)
          .attr('height', this.height);

    var that = this;

    svg.append("g")
      .selectAll("path")
        .data(topojson.feature(app.philly, app.philly.objects.wards).features)
      .enter().append("path")
        .attr("d", this.path)
        .attr("class", function(d) { return 'ward ' + quantize(data[d.id]); })
        .attr("data-slug", this.model.get('slug'))
        .attr("data-year", year)
        .attr("data-location", function(d) { return d.id; })
        .on("click", function() {
          that.getContributions(this, function(contributions) {
            app.contributionView = new app.ContributionView({ collection: contributions });
          });
        });

    svg.append("g")
      .append("path")
        .datum(topojson.mesh(app.philly, app.philly.objects.wards, function(a, b) { return a !== b; }))
        .attr("d", this.path)
        .attr("class", "boundary");

    if(this.model.get('district')) {
      var distNum = this.model.get('district');
      svg.append("g")
        .selectAll("path")
          .data(function() {
            // We only want to draw the district of the selected councilperson
            var active = { type: "GeometryCollection", geometries: [] };
            for(var i=0; i<app.philly.objects.districts.geometries.length; i++) {
              if(app.philly.objects.districts.geometries[i].id == distNum) {
                active.geometries.push(app.philly.objects.districts.geometries[i]);
              }
            }
            return topojson.feature(app.philly, active).features;
          })
        .enter().append('path')
          .attr('d', this.path)
          .attr('class', 'district');

    }

    return this;
  }
});

app.StateView = app.BaseView.extend({
  tagName: 'div',

  initialize: function() {
    this.width = 360;
    this.height = 245;
    this.projection = d3.geo.mercator()
          .center([-77.590, 41.02])
          .scale(3600)
          .translate([this.width / 2, this.height / 2]);
    this.path = d3.geo.path()
          .projection(this.projection);
  },

  render: function(year) {
    this.$el.empty();

    var data = this.model.get('contributions')[year] ? this.model.get('contributions')[year]['county'] : {},
        max = _.max(data),
        fData = d3.map();

        // TODO: Is there a way to modify the values of the topojson
        // IDs so we don't have to do this everytime?
        _.each(data, function(value, i) {
          fData.set(i.toUpperCase(), value);
        });

    var quantize = d3.scale.quantize()
      .domain([0, max])
      .range(d3.range(5).map(function(i) { return "break" + i; }));

    var svg = d3.select(this.el).append('svg')
          .attr('width', this.width)
          .attr('height', this.height);

    var that = this;

    svg.append("g")
      .selectAll("path")
        .data(topojson.feature(app.counties, app.counties.objects['counties']).features)
      .enter().append("path")
        .attr("d", this.path)
        .attr("class", function(d) { return "county " + quantize(fData.get(d.id)); })
        .attr("data-slug", this.model.get('slug'))
        .attr("data-year", year)
        .attr("data-location", function(d) { return d.id.toLowerCase(); })
        .on("click", function() {
          that.getContributions(this, function(contributions) {
            app.contributionView = new app.ContributionView({ collection: contributions });
          });
        });

    svg.append("g")
      .append("path")
        .datum(topojson.mesh(app.counties, app.counties.objects['counties'], function(a, b) { return a !== b; }))
        .attr("d", this.path)
        .attr("class", "boundary");

    return this;
  }
});

app.NationalView = app.BaseView.extend({
  tagName: 'table',

  render: function(year) {
    if(this.model.get('contributions')[year]) {
      var stateList = _.chain(this.model.get('contributions')[year].state)
        .map(function(value, state) {
          return { state: state, total: value };
        })
        .sortBy(function(item) {
          return -item.total;
        })
        .map(function(item) {
          var abbrv = states[item.state].toLowerCase();
          return new app.NationalViewItem({ data: {
            state: item.state,
            abbrv: abbrv,
            total: item.total.formatMoney(),
            slug: this.model.get('slug'),
            year: year
          }}).render().el;
        }, this).value();

      this.$el.html(stateList);

      return this;
    }
  }
});

app.NationalViewItem = app.BaseView.extend({
  tagName: 'tr',

  events: {
    'click td': 'prepGetContributions'
  },

  attributes: function() {
    return {
      'data-slug': this.options.data.slug,
      'data-year': this.options.data.year,
      'data-location': this.options.data.abbrv
    };
  },

  initialize: function() {
    this.template = _.template($('#national-view-template').html());
  },

  render: function() {
    this.$el.html(this.template(this.options.data));
    
    // ughhhh....
    var that = this;
    window.setTimeout(function() { that.delegateEvents(); }, 1);
    
    return this;
  },

  prepGetContributions: function(event) {
    event.stopPropagation();
    this.getContributions($(event.currentTarget).parent(), function(contributions) {
      app.contributionView = new app.ContributionView({ collection: contributions });
    });
  }
});

app.ContributionView = app.BaseView.extend({
  tagName: 'table',

  initialize: function() {
    this.template = _.template($('#contribution-view-template').html());
    $('.contributions').html(this.render().el);
  },

  render: function() {
    var items = this.collection.map(function(c) {
      return (this.template(c));
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

      d3.json('data/counties.json', function(data) {
        app.counties = data;

        d3.json('data/wards_w_districts.json', function(data) {
          app.philly = data;

          Backbone.history.start({ pushState:false, silent:false });
        });
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
        yearSelect: new app.YearSelect({ year: 2012 })
      }));

      $('#app-container').append(new app.PanelView({ model: app.panels.at(0) }).render().el);
    }
  }
});

// go!
app.router = new app.Router();

Number.prototype.formatMoney = function(){
  var c=0, d='.', t=',';
  var n = this, c = isNaN(c = Math.abs(c)) ? 2 : c, d = d == undefined ? "," : d, t = t == undefined ? "." : t, s = n < 0 ? "-" : "", i = parseInt(n = Math.abs(+n || 0).toFixed(c), 10) + "", j = (j = i.length) > 3 ? j % 3 : 0;
  return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};