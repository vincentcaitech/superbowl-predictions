const fs = require('fs');

const write = (c)=>{
    fs.appendFile("./storage/teams.txt",c,(err)=>{
        if(err){
            console.error(err);
            return;
        }
    })
}

fs.readFile("./storage/data.txt","utf8",(err,data)=>{
    if(err){
        console.error(err);
        return;
    }
    var lines = data.split("\n");
    var arr = [];
    console.log(lines.length);
    lines.forEach(line=>{
        let teams = line.split(",");
        let t1 = teams[0];
        let t2 = teams[1];
        if(!arr.includes(t1)) arr.push(t1);
        if(!arr.includes(t2)) arr.push(t2)
    })
    arr.sort();
    var str = "[";
    arr.forEach(a=>{
        str += "\""+a+"\",";
    })
    str+="]"
    write(str);

})