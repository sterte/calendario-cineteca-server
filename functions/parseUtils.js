exports.forceCharachtersEncoding = (text) => {
    text = text.replace(/&#8217;/g, '\'');
    text = text.replace(/&#8211;/g, '-');   
    text = text.replace(/&#8230;/g, '...');   
    text = text.replace(/&#8216;/g, "'");      
    return text;
};


exports.parseMovie = (movie, key = -1) => {

    if(key == -1){
        key = Math.floor(Math.random() * 1000) + 1;
    }
    var movieData = movie.getElementsByClassName('content');            
    if(movieData){

        movieData = movieData[0].getElementsByTagName('a')[0];        
        const url = movieData.getAttribute('href');
        
        var tmpUrl = url;
        var from = tmpUrl.indexOf('bologna.it/') + 'bologna.it/'.length;                
        tmpUrl = tmpUrl.substr(from);
        
        var aaa = tmpUrl.split('/');
        const categoryId = aaa[0];
        const movieId = aaa[1];
        const repeatId = aaa[2].substr(1);
        
        const title = movieData.getElementsByTagName('h5')[0].textContent;         
        const place = movie.getElementsByClassName('place')[0].textContent;
        var data = movie.getElementsByClassName('date')[0];
        data = data.getElementsByClassName('dateD')[0].innerHTML + ' ' + data.getElementsByClassName('datej')[0].innerHTML + ' ' + data.getElementsByClassName('dateM')[0].innerHTML + ' ' + data.getElementsByClassName('datey')[0].innerHTML;
        const time = movie.getElementsByClassName('time')[0].textContent;        
        var imageAndExtras = movie.getElementsByClassName('coverWrap');
        var image = imageAndExtras[0].getElementsByClassName('cover')[0].getAttribute('style');
        image = image.substr(image.indexOf('http')).slice(0, -1);        
        let extras = imageAndExtras[0].getElementsByClassName('label').length > 0 ? imageAndExtras[0].getElementsByClassName('label')[0].innerHTML : '';
        let specialInfo = movie.getElementsByClassName('specialInfo');
        let specialInfoText = "";
        if(specialInfo.length){
            specialInfo = specialInfo[0]     
            specialInfo = specialInfo.getElementsByClassName('infoItem');                  
            for(let i=0; i<specialInfo.length;i++){
                let infoItem = specialInfo[i]                
                infoItem = infoItem.getElementsByClassName('infoText');
                if(infoItem.length){
                    infoItem = infoItem[0].getElementsByTagName('p');
                    if(infoItem.length){
                        for(let j=0;j<infoItem.length;j++){
                            let item = infoItem[j];
                            extras = extras + '<br>' + item.innerHTML;
                        }                            
                    }                        
                }                           
            }            
        }
        extras = '<p>' + extras + '</p>';
        
        var isVO = false;
        var isMUSIC = false;
        const icons = movie.getElementsByClassName('iconSet');
        if(icons.length){
            isVO = icons[0].getElementsByClassName('originalVersion').length ? true : false;
            isMUSIC = false; //TODO
        }
        
        return {           
            key: key,
            id: movieId,     
            categoryId: categoryId,  
            repeatId: repeatId,
            title: title,
            place: place,
            date: data,
            time: time,
            url: url,
            image: image,
            isVO: isVO,
            isMUSIC: isMUSIC,
            extras: extras
        }
    }
};  