all: composite.txt

clean:
	rm -r counties/ counties.zip districts/ districts.zip

composite.txt:
	curl -o composite.txt ftp://ftp.phila-records.com/CF%20DATA%20COMPOSITE%20AS%20OF%2003%2001%202013/CF%20DATA%20COMPOSITE%20AS%20OF%2003%2001%202013.txt

counties.zip:
	curl -o counties.zip http://www.pasda.psu.edu/data/padot/boundary_layers/PaCounty2013_02.zip
	unzip counties.zip -d counties

counties.json: counties.zip
	ogr2ogr -f "GeoJSON" counties/counties.json counties/PaCounty2013_02.shp
	topojson -o counties.json --id-property COUNTY_NAM -q 1000 counties/counties.json

wards.zip:
	curl -o wards.zip http://www.pasda.psu.edu/philacity/data/PhiladelphiaPoliticalWards201302.zip
	unzip wards.zip

wards.json: wards.zip
	ogr2ogr -f "GeoJSON" -t_srs "EPSG:4326" PhiladelphiaPoliticalWards201302/wards.json PhiladelphiaPoliticalWards201302/PhiladelphiaPoliticalWards201302.shp
	topojson -o wards.json --id-property WARD_NUM -q 1000 PhiladelphiaPoliticalWards201302/wards.json

districts.zip:
	curl -o districts.zip http://www.pasda.psu.edu/philacity/data/PhiladelphiaCouncilDistricts_2000.zip
	unzip districts.zip -d districts

wards_w_districts.json: districts.zip wards.json
	ogr2ogr -f "GeoJSON" -t_srs "EPSG:4326"  districts/districts.json districts/PhiladelphiaCouncilDistricts_2000.shp
	topojson -o wards_w_districts.json --id-property WARD_NUM,DIST_NUM -q 1000 PhiladelphiaPoliticalWards201302/waon districts/districts.json