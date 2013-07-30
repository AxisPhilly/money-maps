if (typeof app === 'undefined' || !app) {
  var app = {};
}

app.Candidate = Backbone.Model.extend({
  url: function() {
    return 'data/' + this.get('slug') + '.json';
  }
});

app.Candidates = Backbone.Collection.extend({
  model: app.Candidate
});

app.CandidateView = Backbone.View.extend({
  tagName: 'div',
  className: 'candidate three columns',

  events: {
    'click .forward': 'updateYear',
    'click .backward': 'updateYear',
    'click .close a': 'close'
  },

  initialize: function() {
    this.template = _.template($('#candidate-view-template').html());
    this.year = this.options.year || 2012;
    this.forward = false;
    this.backward = true;

    this.cityView = new app.CityView({
      model: this.model
    });

    this.stateView = new app.StateView({
      model: this.model
    });

    this.nationalView = new app.NationalView({
      model: this.model
    });
  },

  render: function() {
    this.$el.html(this.template($.extend({}, this.model.toJSON(), {
      year: this.year,
      forward: this.forward,
      backward: this.backward
    })));

    this.$el.find('.city').html(this.cityView.render(this.year).el);
    this.$el.find('.state').html(this.stateView.render(this.year).el);
    this.$el.find('.national').html(this.nationalView.render(this.year).el);

    return this;
  },

  updateYear: function(e) {
    var direction = $(e.target).data('direction');

    if (direction === 'forward') {
      this.year = this.year + 1;
    } else {
      this.year = this.year - 1;
    }

    this.forward = true;
    this.backward = true;

    if (!this.model.get(this.year + 1)) {
      this.forward = false;
    }

    if (!this.model.get(this.year - 1)) {
      this.backward = false;
    }

    this.render();
  },

  close: function() {
    this.remove();
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
  tagName: 'ul',

  initialize: function() {
    this.template = _.template($('#national-view-template').html());
  },

  render: function(year) {
    if(this.model.get(year)) {
      var stateList = _.map(this.model.get(year).state, function(value, state) {
        abbrv = states[state].toLowerCase();
        return this.template({
          state: state,
          abbrv: abbrv,
          total: value.formatMoney()
        });
      }, this);

      this.$el.empty().append(stateList);
    }

    return this;
  }
});

app.SelectView = Backbone.View.extend({
  tagName: 'ul',

  render: function() {
    this.collection.each(function(candidate) {
      this.$el.append(new app.SelectItemView({ model: candidate }).render().el);
    }, this);

    return this;
  }
});

app.SelectItemView = Backbone.View.extend({
  tagName: 'li',

  events: {
    'click': 'add'
  },

  render: function() {
    this.$el.html(this.model.get('name'));

    return this;
  },

  add: function(event) {
    event.stopPropagation();

    this.model.fetch({
      success: function(model) {
        $('#candidates').append(new app.CandidateView({
          model: model,
          id: model.get('slug') + '-' + String(Math.random()).split('.')[1]
        }).render().el);
      }
    });
  }
});

app.Router = Backbone.Router.extend({
  initialize: function() {
    d3.json('data/candidates.json', function(data){
      app.candidates = new app.Candidates(data);

      app.selectView = new app.SelectView({ collection: app.candidates });

      $('#select-view').append(app.selectView.render().el);

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
    var candidateList = candidates.split(',');

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
    });
  }
});

// go!
app.router = new app.Router();

Number.prototype.formatMoney = function(){
  var c=0, d='.', t=',';
  var n = this, c = isNaN(c = Math.abs(c)) ? 2 : c, d = d == undefined ? "," : d, t = t == undefined ? "." : t, s = n < 0 ? "-" : "", i = parseInt(n = Math.abs(+n || 0).toFixed(c), 10) + "", j = (j = i.length) > 3 ? j % 3 : 0;
  return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};