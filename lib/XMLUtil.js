const xmljson = require('xmljson');
const fs = require('fs-extra');
const pd = require('pretty-data').pd;

function convertArrays(json)
{
    var keys = Object.keys(json);
    if(keys[0] == '0')
    {
        var array = [];
        keys.forEach(key => {
            var obj = json[key];
            array.push(obj);
            delete json[key];
        })
        return array;
    } else
    {
        keys.forEach(key => {
            if(typeof json[key] == 'object')
            {
                json[key] = convertArrays(json[key]);
            }
        })
        return json;
    }
}

function convertToObject(json)
{
    if(typeof json == 'object')
    {
        var keys = Object.keys(json);
        if(keys[0] == "0")
        {
            var result = {};
            while(json.length > 0)
            {
                result[String(json.length-1)] = json.pop(json.length-1);
            }
            return result;

        } else
        {
            keys.forEach(key => {
                json[key] = convertToObject(json[key]);
            })
            return json;

        }
    } else
    {
        return json;
    }
}

var toJSON = function(file)
{
    var promise = new Promise((resolve,reject) => {
        fs.readFile(file).then(data => {
            xmljson.to_json(data.toString(),function (error, data) {
                if(error)
                {
                    reject(error);
                } else
                {
                    resolve(convertArrays(data));
                }
            });
        });
    });
    return promise;
}

var toXML = function(data)
{
    var promise = new Promise((resolve,reject) => {
        var json = JSON.stringify(convertToObject(data));
        xmljson.to_xml(json, function (error, xml) {
            xml = xml.replace("<data>","");
            xml = xml.replace("</data>","");
            xml = '<?xml version="1.0"?> ' + xml;
            if(error)
            {
                reject(error);
            } else
            {
                resolve(pd.xml(xml));
            }
        });
    });
    return promise;
}

var toXMLFile = function(data,file)
{
    var promise = new Promise((resolve,reject) => {
        toXML(data).then(xmlString => {
            fs.writeFile(file,xmlString).
                then(() => {
                    fs.chown(file,Number(process.env.SUDO_UID),Number(process.env.SUDO_UID)).then(() => {
                        resolve();
                    }).catch(err => { reject(err) });
                }).
                catch(err => {reject(err) });
        });
    });
    return promise;
}

module.exports.toJSON = toJSON;
module.exports.toXML = toXML;
module.exports.toXMLFile = toXMLFile;
