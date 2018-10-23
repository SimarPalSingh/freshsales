var express = require('express');
var reload = require('reload');
var app = express();
var mc = require('./manychat.js');
var dataFile = require('./conf.json');

app.set('port', process.env.PORT || 3000 );//required
app.set('appData', dataFile);
app.set('view engine', 'ejs');
app.set('views', 'app/views');

app.locals.siteTitle = 'Roux Meetups';

app.use(express.static('app/public'));
// app.use(require('./routes/index'));
// app.use(require('./routes/speakers'));

var server = app.listen(app.get('port'), function() {
  console.log('Listening on port ' + app.get('port'));
});

// reload(server, app);

http.createServer(handle_response).listen(port);
bot_fields = {};

async function init() {
    var res = await rp_async('https://api.manychat.com/fb/page/getCustomFields',{method:'get',headers:{Authorization:`Bearer ${conf.token.manychat}`}});
    res = JSON.parse(res);
    console.log(res);
    for (let i=0;i<res.data.length;i++) {
        var field = res.data[i];
        bot_fields[field.name] = field.id;
    }
}
init();

function handle_response(request, response) {
    console.log(request.url);

    var split_url = request.url.split(/(?:\/|\?)/);
    if (split_url[0] == '') {
        // console.log("split_url[0]");
        split_url.shift();
        console.log(split_url[0]);
    }
    console.log(split_url);
    
    if (request.method=='POST') {
        let body = '';
        request.on('data', data=> {
            body += data.toString();
        });
        request.on('end', async() => {
            result = await rest_handle(split_url,body,request,response);
        });
    }
    
}
async function rest_handle(split_url, body, request, response) {
    console.log(body);
    var data = JSON.parse(body);
    switch (split_url[0]) {
        case 'addLead':
            var keyword = (data.keyword_yes == "Yes");
            var url = (is_url(data.website) ? data.website : "");
            var options={
                method:'POST',
                headers: {
                    'Authorization': `Token token=${conf.token.freshsales}`,
                    'Content-Type':'application/json'
                },
                body: {
                    lead:{
                        first_name:data.fname,
                        last_name:data.lname, 
                        mobile_number:data.phone,
                        email:data.email,
                        custom_field:{
                            "cf_keyword_search":keyword,
                            "cf_quantity":data.quantity,
                            "cf_website":url,
                            "cf_industry":data.industry
                        }
                    }
                },
                json:true
            }
            var res = await rp_async('https://ghostwrite.freshsales.io/api/leads',options);
            //console.log(res);
            var lead_url = `https://ghostwrite.freshsales.io/leads/${res.lead.id}`
            var mc_options = {
                method:'post',
                headers:{
                    Authorization:`Bearer ${conf.token.manychat}`
                },
                body:{
                    subscriber_id:data.sub_id,
                    field_id:bot_fields.LeadUrl,
                    field_value:lead_url
                },
                json:true
            }

            res = await rp_async('https://api.manychat.com/fb/subscriber/setCustomField',mc_options);

            var msg = mc.message_create();
            mc.message_add_text(msg,`Thank you ${data.fname} for expressing interest in this service`);
            
            response.writeHead(200);
            response.write(JSON.stringify(msg));
            response.end();
            
            return;

        break;
        case "slackLead": 
            slack_post_msg(data);
            response.writeHead(200);
            response.end();
        break;
    }
}


function rp_async(url,options) {
    return new Promise((resolve,reject) => {
        rp(url,options).then(function (json_string) {
            resolve(json_string);
        }).catch(function (err){
            console.log(err);
            reject("ERROR");
        });
    });
}

async function slack_post_msg(msg_data) {
    var _slack_hook_url = 'https://hooks.slack.com/services/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';
    var msg;
    switch (msg_data.type) {
        case "new_lead":
            var msg_text = `NEW LEAD INBOUND!\n\n\n${msg_data.fname} made an inquiry on Ghostwrite's ChatBot!\n\n\nSee Details:\n\n\nName: ${msg_data.full_name}\n\nWebsite: ${msg_data.website}\n\nEmail: ${msg_data.email}\n\nQuantity: ${msg_data.quantity}\n\nIndustry: ${msg_data.industry}\n\nKeyword Research: ${msg_data.keyword_yes}\n\nLead URL: ${msg_data.lead_url}`;
            msg = {"text":msg_text};
        break;
        case "no_contact":
            var msg_text = `URGENT! No contact yet for the following lead: \n\n\n${msg_data.fname} made an inquiry on Ghostwrite's ChatBot!\n\n\nSee Details:\n\n\nName: ${msg_data.full_name}\n\nWebsite: ${msg_data.website}\n\nEmail: ${msg_data.email}\n\nQuantity: ${msg_data.quantity}\n\nIndustry: ${msg_data.industry}\n\nKeyword Research: ${msg_data.keyword_yes}\n\nLead URL: ${msg_data.lead_url}`;
            msg = {"text":msg_text};
        break;
    }

    var options = {
        method:'POST',
        body:msg,
        json:true
    }
    var res = await rp_async(_slack_hook_url,options)
    console.log(res);

}
