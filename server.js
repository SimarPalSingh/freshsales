var http = require('http');
var rp = require('request-promise');
var mc = require('./manychat.js');
var is_url = require('is-url');

const conf = require('./conf.json');

var port = process.env.PORT || 3000;
console.log(port);
http.createServer(handle_response).listen(port);
bot_fields = {};

async function init() {
    for (var i=0;i<conf.bots.length;i++) {
        var bot = conf.bots[i];
        bot_fields[bot] = {};
        if (conf[bot] == undefined || conf[bot].manychat == "") {
            console.log(bot);
            continue;
        }
        var res = await rp_async('https://api.manychat.com/fb/page/getCustomFields',{method:'get',headers:{Authorization:`Bearer ${conf[bot].manychat}`}});
        res = JSON.parse(res);
        console.log(res);
        for (let i=0;i<res.data.length;i++) {
            var field = res.data[i];
            bot_fields[bot][field.name] = field.id;
        }
    }
}
init();

function handle_response(request, response) {
    console.log(request.url);

    var split_url = request.url.split(/(?:\/|\?)/);
    if (split_url[0] == '') {
        split_url.shift();
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
    console.log('this thing on?');
    var data = JSON.parse(body);
    console.log("URL: " + conf[data.bot].url);
    switch (split_url[0]) {
        case 'addLead':
            var keyword = (data.keyword_yes == "Yes");
            var url = (is_url(data.website) ? data.website : "");
            var cust = {};
            if (data.bot == 'ghostwrite') {
                cust = {
                    "cf_keyword_search":keyword,
                    "cf_quantity":data.quantity,
                    "cf_website":url,
                    "cf_industry":data.industry
                }
            } else if (data.bot == 'dq_electrical') {
                cust = {
                    "cf_customer_inquiry":data.inquiry
                }
            }
            console.log('pre-POST'); 
            var options={
                method:'POST',
                headers: {
                    'Authorization': `Token token=${conf[data.bot].freshsales}`,
                    'Content-Type':'application/json'
                },
                body: {
                    lead:{
                        first_name:data.fname,
                        last_name:data.lname, 
                        mobile_number:data.phone,
                        email:data.email,
                        custom_field:cust
                    }
                },
                json:true
            }
            var res = await rp_async(`${conf[data.bot].url}/api/leads`,options);
            console.log(res);
            var lead_url = `${conf[data.bot].url}/api/leads/${res.lead.id}`
            var mc_options = {
                method:'post',
                headers:{
                    Authorization:`Bearer ${conf[data.bot].manychat}`
                },
                body:{
                    subscriber_id:data.sub_id,
                    field_id:bot_fields[data.bot].LeadUrl,
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
        case "no_contact":
            write_email(data.full_name, data.phone, data.email, data.inquiry, data.home_business, data.service_area, data.lead_link, data.bot, true);
            response.writeHead(200);
            response.end();
        break;
        case "get_human": 
            email_human(data.full_name, data.inquiry, data.page_name, data.page_id, data.user_id);
            response.writeHead(200);
            response.end();
        break;
    }
}


function rp_async(url,options) {    // test comment
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
    var _slack_hook_url = conf[msg_data.bot].slack;
    if (_slack_hook_url == "") return;      // no valid url - aborting

    var msg;
    switch (msg_data.type) {
        case "new_lead":
            var msg_text = `NEW LEAD INBOUND!\n\n\n${msg_data.fname} made an inquiry through the ChatBot!\n\n\nSee Details:\n\n\nName: ${msg_data.full_name}\n\nWebsite: ${msg_data.website}\n\nEmail: ${msg_data.email}\n\nQuantity: ${msg_data.quantity}\n\nIndustry: ${msg_data.industry}\n\nKeyword Research: ${msg_data.keyword_yes}\n\nLead URL: ${msg_data.lead_url}`;
            msg = {"text":msg_text};
        break;
        case "no_contact":
            var msg_text = `URGENT! No contact yet for the following lead: \n\n\n${msg_data.fname} made an inquiry through the ChatBot!\n\n\nSee Details:\n\n\nName: ${msg_data.full_name}\n\nWebsite: ${msg_data.website}\n\nEmail: ${msg_data.email}\n\nQuantity: ${msg_data.quantity}\n\nIndustry: ${msg_data.industry}\n\nKeyword Research: ${msg_data.keyword_yes}\n\nLead URL: ${msg_data.lead_url}`;
            msg = {"text":msg_text};
        break;
    }

    var options = {
        method:'POST',
        body:msg,
        json:true
    };
    var res = await rp_async(_slack_hook_url,options);
    console.log(res);
}

async function write_email(full_name, phone, email, inquiry, home_business, service_area, lead_link, bot, urgent) {
    
    var body = `Full Name: ${full_name}\nPhone: ${phone}\nEmail: ${email}\nHome/Business: ${home_business}\nInquiry: ${inquiry}\nService Area: ${service_area}\n<a href="${lead_link}">View lead on FreshSales</a>`;
    var subject = "";
    if (urgent) {
        subject = `URGENT! No contact for ${full_name}`;
    } else {
        subject = `New lead from ${full_name}`;
    }
    var to = conf[bot].email_destinations;
    console.log(`To: ${JSON.stringify(to)}\nSubject: ${subject}\nBody: ${body}`);

}

async function email_human(full_name, inquiry, page_name, page_id, user_id) {

    var body = `${full_name} has requested to speak to a human! \nInquiry: ${inquiry}\nLink to conversation: `;
    var link = `https://business.facebook.com/${page_name}/inbox/?mailbox_id=${page_id}&selected_item_id=${user_id}`;
    console.log(`Body: ${body}\nLink: ${link}`);
}