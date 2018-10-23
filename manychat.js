const mc = require('./manychat-templates.json')

object_copy = function (object) {
    return JSON.parse(JSON.stringify(object));
}

module.exports.message_create = function () {
    return object_copy(mc.response);
}

module.exports.message_add_text = function (msg,body,btns=[]) {
    var new_text = object_copy(mc.template.text);
    new_text.text = body;
    if (btns != []) {
        new_text.buttons = btns;
    }
    msg.content.messages.push(new_text);
}

module.exports.message_add_image = function(msg,img_url) {
    var new_img = object_copy(mc.template.image);
    new_img.url = img_url;
    msg.content.messages.push(new_img);
}

module.exports.message_add_cards = function(msg,cards) {
    var new_cards = object_copy(mc.template.cards);
    new_cards.elements = cards;
    msg.content.messages.push(new_cards);
    return new_cards.elements;

}

module.exports.new_card = function(title, subtitle, url,action = '', buttons = []) {
    var card = object_copy(mc.elements.card);
    card.title = title;
    card.subtitle = subtitle;
    card.image_url = url
    if (action != '') {
        card.action_url = action;
    }
    if (buttons != []) {
        card.buttons = buttons;
    }
    return card;
}

module.exports.new_button_url = function(caption,url,size="full") {
    var btn = object_copy(mc.button.url);
    btn.caption = caption;
    btn.type = "url";
    btn.url = url;
    btn.size = size;
    return btn; 
}

module.exports.new_button_flow = function(caption,flow_id) {
    var btn = object_copy(mc.button.flow)
    btn.caption = caption;
    btn.target = flow_id;
    return btn;
}

module.exports.new_button_share = function() {
    var btn = object_copy(mc.button.share);
    return btn;
}

module.exports.new_button_call = function(caption,phone) {
    var btn = object_copy(mc.button.call)
    btn.caption = caption;
    btn.phone = phone;
    return btn;
}

module.exports.new_button_node = function(caption,node) {
    var btn = object_copy(mc.button.node);
    btn.caption = caption;
    btn.target = node;
    return btn;
}

module.exports.add_quick_reply_node = function(msg,caption,node) {
    var btn = module.exports.new_button_node(caption,node);
    msg.content.quick_replies.push(btn);
}

module.exports.add_quick_reply_flow = function(msg,caption,flow) {
    var btn = module.exports.new_button_flow(caption,flow);
    msg.content.quick_replies.push(btn);
}

module.exports.add_action_add_tag = function(msg,tag_name) {
    var action = object_copy(mc.actions.add_tag);
    action.tag_name = tag_name;
    msg.content.actions.push(action);
}

module.exports.add_action_remove_tag = function(msg,tag_name) {
    var action = object_copy(mc.actions.remove_tag);
    action.tag_name = tag_name;
    msg.content.actions.push(action);
}

module.exports.add_action_set_field = function(msg,field_name,field_value) {
    var action = object_copy(mc.actions.set_field_value);
    action.field_name = field_name;
    action.value = field_value;
    msg.content.actions.push(action);
}