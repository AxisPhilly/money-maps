all: composite.txt

clean:
	rm -r counties/ counties.zip

composite.txt:
	curl -o composite.txt ftp://ftp.phila-records.com/CF%20DATA%20COMPOSITE%20AS%20OF%2003%2001%202013/CF%20DATA%20COMPOSITE%20AS%20OF%2003%2001%202013.txt

counties.zip:
	curl -o counties.zip http://www.pasda.psu.edu/data/padot/boundary_layers/PaCounty2013_02.zip
	unzip counties.zip -d counties

counties.json: counties.zip
	ogr2ogr -f "GeoJSON" counties/counties.json counties/PaCounty2013_02.shp
	topojson -o counties.json --id-property COUNTY_NAM -q 1000 counties/counties.json