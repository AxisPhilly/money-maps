if (typeof app === 'undefined' || !app) {
  var app = {};
}

app.Candidate = Backbone.Model.extend({
  url: function() {
    return 'data/' + this.get('slug') + '.json';
  }
});

app.YearSelect = Backbone.Model.extend({
  defaults: {
    forward: false,
    backward: true,
    year: 2012
  },

  validateYear: function(candidate, direction) {
    if (direction === 'forward') {
      this.set('year', this.get('year') + 1);
    } else {
      this.set('year', this.get('year') - 1);
    }

    this.set('forward', true);
    this.set('backward', true);

    if (!candidate.get(this.get('year') + 1)) {
      this.set('forward', false);
    }

    if (!candidate.get(this.get('year') - 1)) {
      this.set('backward', false);
    }
  }
});

app.Candidates = Backbone.Collection.extend({
  model: app.Candidate
});

app.PanelView = Backbone.View.extend({
  tagName: 'div',
  className: 'panel-view',

  events: {
    'change select': 'selectCandidate',
    'click .forward': 'updateYear',
    'click .backward': 'updateYear'
  },

  initialize: function() {
    this.template = _.template($('#panel-view-template').html());
    this.yearSelect = new app.YearSelect({ year: this.options.year || 2012 });
    this.yearSelectView = new app.YearSelectView({ model: this.yearSelect });
  },

  render: function() {
    this.$el.html(this.template({}));

    this.candidateSelectView = new app.CandidateSelectView({ collection: this.collection });
    this.$el.find('.candidate-select-view')
      .append(this.candidateSelectView.render().el)
      .find('select')
      .chosen({ disable_search_threshold: 15 });

    this.$el.find('.year-select-view').html(this.yearSelectView.render().el);

    return this;
  },

  selectCandidate: function(e) {
    if(this.candidateView) {
      this.year = 2012;
    }

    var slug = this.$el.find(':selected').val();
    this.model = app.candidates.findWhere({ slug: slug });

    var that = this;
    this.model.fetch({
      success: function(model) {
        that.candidateView = new app.CandidateView({
          model: model,
          id: model.get('slug') + '-' + String(Math.random()).split('.')[1]
        });

        that.$el.find('.candidate').html(that.candidateView.render(that.yearSelect.get('year')).el);
      }
    });
  },

  updateYear: function(event) {
    event.stopPropagation();
    var direction = $(event.target).data('direction');
    this.yearSelect.validateYear(this.model, direction);
    this.$el.find('.candidate').html(this.candidateView.render(this.yearSelect.get('year')).el);
  }
});

app.CandidateView = Backbone.View.extend({
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

app.CityView = Backbone.View.extend({
  initialize: function() {
    this.width = 300;
    this.height = 329;
    this.projection = d3.geo.mercator()
          .center([-75.1182, 40.0032])
          .scale(50000)
          .translate([this.width / 2, this.height / 2]);
    this.path = d3.geo.path()
          .projection(this.projection);
  },

  render: function(year) {
    this.$el.empty();

    var data = this.model.get(year) ? this.model.get(year)['ward'] : {},
        max = _.max(data);

    var quantize = d3.scale.quantize()
      .domain([0, max])
      .range(d3.range(5).map(function(i) { return "ward break" + i; }));

    var svg = d3.select(this.el).append('svg')
          .attr('width', this.width)
          .attr('height', this.height);

    svg.append("g")
      .selectAll("path")
        .data(topojson.feature(app.philly, app.philly.objects.wards).features)
      .enter().append("path")
        .attr("d", this.path)
        .attr("class", function(d) { return quantize(data[d.id]); });

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

app.StateView = Backbone.View.extend({
  tagName: 'div',

  initialize: function() {
    this.width = 300;
    this.height = 177;
    this.projection = d3.geo.mercator()
          .center([-77.590, 41.02])
          .scale(2500)
          .translate([this.width / 2, this.height / 2]);
    this.path = d3.geo.path()
          .projection(this.projection);
  },

  render: function(year) {
    this.$el.empty();

    var data = this.model.get(year) ? this.model.get(year)['county'] : {},
        max = _.max(data),
        fData = d3.map();

        // TODO: Is there a way to modify the values of the topojson
        // IDs so we don't have to do this everytime?
        _.each(data, function(value, i) {
          fData.set(i.toUpperCase(), value);
        });

    var quantize = d3.scale.quantize()
      .domain([0, max])
      .range(d3.range(5).map(function(i) { return "county break" + i; }));

    var svg = d3.select(this.el).append('svg')
          .attr('width', this.width)
          .attr('height', this.height);

    svg.append("g")
      .selectAll("path")
        .data(topojson.feature(app.counties, app.counties.objects['counties']).features)
      .enter().append("path")
        .attr("d", this.path)
        .attr("class", function(d) { return quantize(fData.get(d.id)); });

    svg.append("g")
      .append("path")
        .datum(topojson.mesh(app.counties, app.counties.objects['counties'], function(a, b) { return a !== b; }))
        .attr("d", this.path)
        .attr("class", "boundary");

    return this;
  }
});

app.NationalView = Backbone.View.extend({
  tagName: 'table',

  initialize: function() {
    this.template = _.template($('#national-view-template').html());
  },

  render: function(year) {
    if(this.model.get(year)) {
      var stateList = _.chain(this.model.get(year).state)
        .map(function(value, state) {
          return { state: state, total: value };
        })
        .sortBy(function(item) {
          return -item.total;
        })
        .map(function(item) {
          var abbrv = states[item.state].toLowerCase();
          return this.template({
            state: item.state,
            abbrv: abbrv,
            total: item.total.formatMoney()
          });
        }, this)
        .value();

      this.$el.empty().append(stateList);
    }

    return this;
  }
});

app.CandidateSelectView = Backbone.View.extend({
  tagName: 'select',

  attributes: {
    'data-placeholder': 'Select a candidate'
  },

  render: function() {
    // Insert a blank option first so we can have a placeholder value
    this.$el.append('<option></option>');

    this.collection.each(function(candidate) {
      this.$el.append(new app.SelectItemView({ model: candidate }).render().el);
    }, this);

    return this;
  }
});

app.SelectItemView = Backbone.View.extend({
  tagName: 'option',

  render: function() {
    this.$el.html(this.model.get('name')).val(this.model.get('slug'));

    return this;
  }
});

app.YearSelectView = Backbone.View.extend({
  initialize: function() {
    this.template = _.template($('#year-select-view-template').html());
    this.model.on('change', this.render, this);
  },

  render: function() {
    this.$el.html(this.template(this.model.attributes));
    return this;
  }
});

app.ShareView = Backbone.View.extend({
  events: {
    'click #share-custom': 'shareCustom'
  },

  // Generate sharable link based on active panels
  shareCustom: function(event) {
    event.preventDefault();
    var candidateList = [];

    $('#candidates').children().each(function(index, candidate){
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
      //app.shareView = new app.ShareView({ el: '#share-view' });
      app.panels = [];
      app.panels.push(new app.PanelView({ collection: app.candidates }));
      $('#app-container').append(app.panels[0].render().el);

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
    ':candidates': 'index'
  },

  index: function(candidates) {
    /*var candidateList = candidates.split(',');

    _.each(candidateList, function(candidate) {
      var initials = candidate.split('-')[0],
          year = candidate.split('-')[1];

      var model = app.candidates.find(function(c) {
        return c.get('initials') == initials;
      });

      if (model) {
        model.fetch({
          success: function(model) {
            $('#candidates').append(new app.CandidateView({
              model: model,
              id: model.get('slug') + '-' + String(Math.random()).split('.')[1],
              year: year
            }).render().el);
          }
        });
      }
    });*/
  }
});

// go!
app.router = new app.Router();

Number.prototype.formatMoney = function(){
  var c=0, d='.', t=',';
  var n = this, c = isNaN(c = Math.abs(c)) ? 2 : c, d = d == undefined ? "," : d, t = t == undefined ? "." : t, s = n < 0 ? "-" : "", i = parseInt(n = Math.abs(+n || 0).toFixed(c), 10) + "", j = (j = i.length) > 3 ? j % 3 : 0;
  return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};