const fs = require('fs');
const axios = require('axios');
const keys = ['3387f2aae76ebd4f915de5ade19634dc', '806178332e93277d48d196c6981d3598', '35ea21e11d1a80d9ef41014a1b8513b4',
    '27b4b0aeb8dd4c32614f13d3e3fd866f', '09ee92217380c74c07119fbc31191078', '188237b34dde0db2acdb536db5763df9',
    '5f9f8a5b20757d48f26cce0125f3f24d', '93495dcc4cc8085550fff629c000616e', 'fb206e2bb6c03d6d021de271c64b3d3d'];

let serachFromAMap = async () => {
    let key = keys[Math.floor(Math.random() * keys.length)];
    let url = `http://restapi.amap.com/v3/config/district?key=${key}&subdistrict=3&extensions=base`;
    let data = await axios.get(url).then(response => response.data);
    while (true) {
        if (data.infocode !== '10000') {
            console.log(`KEY[${key}]失效`, data.infocode, data.info);
            keys.splice(keys.indexOf(key), 1);
            key = keys[Math.floor(Math.random() * keys.length)];
            url = `http://restapi.amap.com/v3/config/district?key=${key}&subdistrict=3&extensions=base`;
            data = await axios.get(url).then(response => response.data);
        } else {
            break;
        }
    }
    return data.count === '1' ? data.districts[0] : null;
}

let rows = [];
let list = [];
let printAreaRow = (district) => {
    for (let item of district.districts) {
        if (item.adcode !== district.adcode) {
            rows.push(`${item.name}, ${item.adcode}, ${item.level}`);
            list.push({
                name: item.name,
                adcode: item.adcode,
                level: item.level
            });
            printAreaRow(item);
        }
    }
}

(async () => {
    const district = await serachFromAMap();
    if (district) {
        rows.push('行政名称, 行政编码, 行政等级');
        printAreaRow(district);
        fs.writeFile('adcode-map.csv', rows.join('\n'), (err) => {
            if (err) {
                return console.log(err);
            }
            console.log('省市区县行政信息已保存至adcode-map.csv');
        })
        fs.writeFile('json/adcode-map.json', JSON.stringify(list), (err) => {
            if (err) {
                return console.log(err);
            }
            console.log('行政名称与行政编码对照表已保存至json/adcode-map.json');
        })
    }
})();
