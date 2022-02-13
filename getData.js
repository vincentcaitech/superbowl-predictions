const fs = require('fs');
var axios = require("axios").default;

var content = "";

const write = (c)=>{
    fs.appendFile("./storage/data.txt",c,(err)=>{
        if(err){
            console.error(err);
            return;
        }
    })
}


/** Write to "content" below */


const getOnePage = async (pageNum) => {
    var options = {
        method: 'GET',
        url: 'https://viperscore.p.rapidapi.com/competition/games/last',
        params: {competitionId: '9464', seasonId: '36422', page: pageNum.toString()},
        headers: {
            'x-rapidapi-host': 'viperscore.p.rapidapi.com',
            'x-rapidapi-key': '6f6923b549msh7fbb3590a494491p19cd55jsn62b37a5f6b1f'
        }
    };


    try{
        var res = await axios.request(options);
        var data = res.data["events"];
        var hasNextPage = res.data["hasNextPage"]
        data.forEach(gameObj=>{
            let homeTeam = gameObj["homeTeam"]["code"];
            let awayTeam = gameObj["awayTeam"]["code"];
            let homeScore = gameObj["homeScore"]["current"];
            let awayScore = gameObj["awayScore"]["current"];
            let str = homeTeam + "," + awayTeam + "," + homeScore + "," + awayScore +"\n";
            console.log(str);
            write(str);
        })
        if(hasNextPage){
            getOnePage(pageNum+1);
            return;
        }
    }catch(e){
        console.error(e);
    }
}

getOnePage(0);


/** Write to "content" above */
