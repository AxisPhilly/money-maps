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

pa_municipalities.zip:
	curl -o pa_municipalities.zip http://www.pasda.psu.edu/data/padot/boundary_layers/PaMunicipalities2013_03.zip
	unzip pa_municipalities.zip -d pa_municipalities

pa_muni_trimmed.shp: pa_municipalities.zip
	ogr2ogr -f "ESRI Shapefile" -t_srs "EPSG:4326" -sql "SELECT MUNICIPAL1 as muni, COUNTY as county_num FROM PaMunicipalities2013_03 WHERE COUNTY IN ('09', '15', '67', '46', '23')" pa_municipalities/pa_muni_trimmed.shp pa_municipalities/PaMunicipalities2013_03.shp

pa_counties_trimmed.shp: counties.zip
	ogr2ogr -f "ESRI Shapefile" -t_srs "EPSG:4326" -sql "SELECT COUNTY_NAM as county, COUNTY_NUM as county_num FROM PaCounty2013_02" counties/pa_counties_trimmed.shp counties/PaCounty2013_02.shp

pa_counties.csv: counties.zip
	ogr2ogr -f "CSV" counties/pa_counties.csv	counties/pa_counties_trimmed.shp

nj_boundaries.zip:
	curl -o nj_boundaries.zip https://njgin.state.nj.us/oit/gis/download/bounds_nj_shp.zip	
	unzip nj_boundaries.zip -d nj_boundaries

nj_muni_trimmed.shp: nj_boundaries.zip
	ogr2ogr -f "ESRI Shapefile" -t_srs "EPSG:4326" -sql "SELECT MUN as muni, COUNTY as county FROM nj_munis WHERE COUNTY IN ('SALEM', 'CAMDEN', 'BURLINGTON')" nj_boundaries/nj_muni_trimmed.shp nj_boundaries/nj_munis.shp

munis.json: pa_muni_trimmed.shp pa_counties_trimmed.shp pa_counties.csv
	topojson -o munis.json -q 1000 --id-property=county_num -e counties/pa_counties.csv -p county_name=county,muni -- pa_municipalities/pa_muni_trimmed.shp