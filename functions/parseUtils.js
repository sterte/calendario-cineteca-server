exports.forceCharachtersEncoding = (text) => {
    text = text.replace(/&#8217;/g, '\'');
    text = text.replace(/&#8211;/g, '-');   
    text = text.replace(/&#8230;/g, '...');   
    
    return text;
};