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

  initialize: function() {
    this.template = _.template($('#candidate-view-template').html());
  },

  render: function() {
    this.$el.html(this.template(this.model.toJSON()));

    return this;
  }
});

app.CityView = Backbone.View.extend({

});

app.StateView = Backbone.View.extend({

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

      Backbone.history.start({ pushState:false, silent:true });
    });

    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g
    };
  }
});


app.router = new app.Router();


function generateMap(input, divId, year, mapId, mapType) { 

  if (mapType == "Ward") {

    var width = 370,
      height = 406,
      centered;

    var projection = d3.geo.mercator()
        .center([-75.1180, 40.0032])
        .scale(65000)
        .translate([width / 2, height / 2]);

  }

  else if (mapType == "County") {

    var width = 370,
    height = 218,
    centered;

    var projection = d3.geo.mercator()
      .center([-77.590, 41.02])
      .scale(3605)
      .translate([width / 2, height / 2]);
  }

  var map = d3.map();

  var path = d3.geo.path()
      .projection(projection);

  var svg = d3.select(divId).append("svg")
      .attr("width", width)
      .attr("height", height);  

  svg.append("rect")
      .attr("class", "background")
      .attr("width", width)
      .attr("height", height)

  queue()
      .defer(d3.json, "data/"+mapId+".json")
      .defer(d3.json, input)
      .await(ready);

  var city = svg.append("g");
  var allValues = new Array();
    function ready(error, jsonGeo, data) {
      _.each(data[year][mapType], function(value, index){
        map.set(index.toUpperCase(), value);
        allValues.push(value);
      });              

    maxValue = d3.max(allValues);

    var quantize = d3.scale.quantize()
      .domain([0, maxValue])
      .range(d3.range(4).map(function(i) { return "d" + i + "-4"; }));   
      city.selectAll("id")
        .data(topojson.object(jsonGeo, jsonGeo.objects[mapId]).geometries)
        .enter().append("path")
          .attr("class", function(d) { return quantize(map.get(d.id))})
          .attr("d", path);
      };
}

//generateMap('data/data.json', '#state-map-1', '2008', 'pa_counties', "County");
//generateMap('data/data.json', '#city-map-1', '2007', 'philadelphia_wards', "Ward");