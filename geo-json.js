const fs = require('fs');
const axios = require('axios');
const parser = require('./lib/parseGeoJson.js');

const keys = ['3387f2aae76ebd4f915de5ade19634dc', '806178332e93277d48d196c6981d3598', '35ea21e11d1a80d9ef41014a1b8513b4',
    '27b4b0aeb8dd4c32614f13d3e3fd866f', '09ee92217380c74c07119fbc31191078', '188237b34dde0db2acdb536db5763df9',
    '5f9f8a5b20757d48f26cce0125f3f24d', '93495dcc4cc8085550fff629c000616e', 'fb206e2bb6c03d6d021de271c64b3d3d'];

let serachFromAMap = async (adcode, polyline) => {
    let key = keys[Math.floor(Math.random() * keys.length)];
    let url = `http://restapi.amap.com/v3/config/district?key=${key}&subdistrict=${polyline ? 0 : 1}&extensions=${polyline ? 'all' : 'base'}&keywords=${adcode}`;
    let data = await axios.get(url).then(response => response.data);
    while (true) {
        if (data.infocode !== '10000') {
            console.log(`KEY[${key}]失效`, data.infocode, data.info);
            keys.splice(keys.indexOf(key), 1);
            key = keys[Math.floor(Math.random() * keys.length)];
            url = `http://restapi.amap.com/v3/config/district?key=${key}&subdistrict=${polyline ? 0 : 1}&extensions=${polyline ? 'all' : 'base'}&keywords=${adcode}`;
            data = await axios.get(url).then(response => response.data);
        } else {
            break;
        }
    }
    return data.count === '1' ? data.districts[0] : null;
};

let parseToFeature = (district) => {
    let feature = {};
    feature.id = district.adcode;
    feature.type = 'Feature';
    feature.properties = {};
    feature.properties.name = district.name;
    feature.properties.cp = district.center.split(',').map(item => Number(item));

    let polylines = district.polyline.split('|');
    let coordinates = [];
    let coordinateGroups = polylines.map(polyline => polyline.split(';').map(pointStr => pointStr.split(',').map(item => Math.floor(item * 1024) / 1024)));
    if (coordinateGroups.length > 1) {
        coordinateGroups.forEach(item => {
            coordinates.push([item]);
        })
    } else {
        coordinateGroups.forEach(item => {
            coordinates.push(item);
        })
    }
    feature.geometry = {};
    feature.geometry.type = coordinateGroups.length > 1 ? 'MultiPolygon' : 'Polygon';
    feature.geometry.coordinates = coordinates;

    return feature;
};

let loopHandle = async (adcode) => {
    const district = await serachFromAMap(adcode, false);
    if (district) {
        console.log(`开始处理[${district.name}]的全部子行政单位`);
        let geo = {};
        geo.type = 'FeatureCollection';
        let features = [];
        for (let child of district.districts) {
            if (adcode != child.adcode) {
                const childDistrict = await serachFromAMap(child.adcode, true);
                console.log(`开始处理[${childDistrict.name}]的行政边界数据`);
                features.push(parseToFeature(childDistrict));
            }
        }
        geo.features = features;
        const encodeGeo = parser.encode(geo);
        fs.writeFile(`json/${adcode}.json`, JSON.stringify(encodeGeo), (err) => {
            if (err) {
                return console.log(err);
            }
        });
        console.log(`GeoJson文件[${adcode}.json]保存成功`);
        for (let child of district.districts) {
            if (adcode != child.adcode && child.adcode % 100 === 0) {
                await loopHandle(child.adcode);
            }
        }
    }
};

(async () => {
    await loopHandle('100000');
})();
