const fs = require('fs');
const axios = require('axios');
const keys = [];

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
