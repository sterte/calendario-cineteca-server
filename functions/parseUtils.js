exports.forceCharachtersEncoding = (text) => {
    text = text.replace(/&#8217;/g, '\'');
    text = text.replace(/&#8211;/g, '-');   
    text = text.replace(/&#8230;/g, '...');   
    text = text.replace(/&#8216;/g, "'");      
    text = text.replace(/&amp;/g, "&");     
    return text;
};


exports.parseMovie = (movie, key = -1) => {

    if(key == -1){
        key = Math.floor(Math.random() * 1000) + 1;
    }
    var movieData = movie.getElementsByClassName('c-repeat-loop__content-container');            
    if(movieData){

        movieData = movieData[0].getElementsByTagName('a')[0];        
        const url = movieData.getAttribute('href');
        
        var tmpUrl = url;
        var from = tmpUrl.indexOf('programmazione/') + 'programmazione/'.length;                
        tmpUrl = tmpUrl.substr(from);
        var aaa = tmpUrl.split('/');
        const categoryId = aaa[0];
        const movieId = aaa[1];
        const repeatId = aaa[2].substr(1);
        
        const title = movieData.getElementsByTagName('h6')[0].textContent; 
        const place = movie.getElementsByClassName('c-repeat-loop__where')[0].textContent;
        var data = movie.getElementsByClassName('c-repeat-loop__date')[0].textContent;
        const time = movie.getElementsByClassName('c-repeat-loop__time')[0].textContent;
        var image = movie.getElementsByClassName('c-repeat-loop__cover-wrap')[0];
        image = image.getElementsByTagName('img')[0];
        image = image.getAttribute('src');
       
        let extras = movie.getElementsByClassName('c-repeat-loop__label').length > 0 ? movie.getElementsByClassName('c-repeat-loop__label')[0].innerHTML : '';
        let specialInfo = movie.getElementsByClassName('specialInfo'); //TODO
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
       
        
        var isVO = movie.getElementsByClassName('fa-volume-off').length;
        var isMUSIC = false; //TODO
        
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