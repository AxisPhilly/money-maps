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
  className: 'candidate',

  initialize: function() {
    this.template = _.template($('#candidate-view-template').html());
    this.year = 2012;
    this.cityView = new app.CityView({
      year: this.year,
      model: this.model,
      parentId: this.id
    });
    this.stateView = new app.StateView({
      year: this.year,
      model: this.model,
      parentId: this.id
    });
  },

  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    this.cityView.render();
    this.stateView.render();

    return this;
  }
});

app.CityView = Backbone.View.extend({
  tagName: 'div',
  className: 'city',

  initialize: function() {
    this.width = 370;
    this.height = 406;
    this.projection = d3.geo.mercator()
          .center([-75.1182, 40.0032])
          .scale(65000)
          .translate([this.width / 2, this.height / 2]);
    this.path = d3.geo.path()
          .projection(this.projection);
  },

  render: function() {
    if (this.model.get(this.options.year)) {
      var data = this.model.get(this.options.year)['ward'],
          max = _.max(data);

      var quantize = d3.scale.quantize()
        .domain([0, max])
        .range(d3.range(5).map(function(i) { return "ward break" + i; }));

      var svg = d3.select(this.el).append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

      svg.append("g")
        .selectAll("path")
          .data(topojson.feature(app.wards, app.wards.objects['wards']).features)
        .enter().append("path")
          .attr("d", this.path)
          .attr("class", function(d) { return quantize(data[d.id]); });

      $('#' + this.options.parentId + ' .city').html(this.el);
    } else {
      var that = this;
      this.model.fetch({ success: function() { that.render(); } });
    }
  }
});

app.StateView = Backbone.View.extend({
  tagName: 'div',

  initialize: function() {
    this.width = 370;
    this.height = 218;
    this.projection = d3.geo.mercator()
          .center([-77.590, 41.02])
          .scale(3605)
          .translate([this.width / 2, this.height / 2]);
    this.path = d3.geo.path()
          .projection(this.projection);
  },

  render: function() {
    if (this.model.get(this.options.year)) {
      var data = this.model.get(this.options.year)['county'];
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

      $('#' + this.options.parentId + ' .state').html(this.el);
    } else {
      var that = this;
      this.model.fetch({ success: function() { that.render(); } });
    }
  }
});

app.NationalView = Backbone.View.extend({

});

app.SelectView = Backbone.View.extend({
  tagName: 'ul',

  initialize: function() {

  },

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

  add: function() {
    $('#candidates').append(new app.CandidateView({
      model: this.model,
      id: this.model.get('slug') + '-' + String(Math.random()).split('.')[1]
    }).render().el);
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

        d3.json('data/wards.json', function(data) {
          app.wards = data;

          Backbone.history.start({ pushState:false, silent:true });
        });
      });
    });

    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g
    };
  }
});

// go!
app.router = new app.Router();