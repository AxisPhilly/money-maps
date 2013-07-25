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
    this.cityView = new app.CityView({});
    this.stateView = new app.StateView({});
  },

  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    this.$el.find('.city').html(this.cityView.render().el);
    this.$el.find('.state').html(this.stateView.render().el);

    return this;
  }
});

app.CityView = Backbone.View.extend({
  tagName: 'div',

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
    var svg = d3.select(this.el).append('svg')
          .attr('width', this.width)
          .attr('height', this.height);

    svg.append("g")
      .selectAll("path")
        .data(topojson.feature(app.wards, app.wards.objects['philadelphia_wards']).features)
      .enter().append("path")
        .attr("d", this.path);

    return this;
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
    var svg = d3.select(this.el).append('svg')
          .attr('width', this.width)
          .attr('height', this.height);

    svg.append("g")
      .selectAll("path")
        .data(topojson.feature(app.counties, app.counties.objects['pa_counties']).features)
      .enter().append("path")
        .attr("d", this.path);

    return this;
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
    this.$el.html(this.model.get('slug'));

    return this;
  },

  add: function() {
    $('#candidates').append(new app.CandidateView({ model: this.model }).render().el);
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