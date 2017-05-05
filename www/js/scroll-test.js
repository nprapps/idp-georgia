let scrollController = null;
var wh = window.innerHeight;

var onWindowLoaded = function(e) {
    initScrollElements();
};

const initScrollElements = function() {
    scrollController = new ScrollMagic.Controller();

    document.querySelectorAll('.panel').forEach(function(d,i) {

        if (d.classList.contains('panel-characters')) {
            var innerText = d.querySelector('.text-wrapper');
            var irakliText = d.querySelector('.irakli-bio');
            var anaText = d.querySelector('.ana-bio');
            var verikoText = d.querySelector('.veriko-bio');
            var irakliImage = d.querySelector('.char-irakli');
            var anaImage = d.querySelector('.char-ana');
            var verikoImage = d.querySelector('.char-veriko');
            var wrapText = d.querySelector('.wrap-bio');
            var timeline = new TimelineLite()
                .to(innerText, 1, { opacity: 1 })
                .to(irakliText, 1, { opacity: 1 }, 0);

            new ScrollMagic.Scene({
                duration: '50%',
                triggerElement: d,
            })
            .addIndicators({
                colorStart: "rgba(0,0,0,0.5)",
                colorEnd: "rgba(0,0,0,0.5)",
                colorTrigger : "rgba(0,0,0,1)",
                name:name
            })
            .setTween(timeline)
            .addTo(scrollController);

            new ScrollMagic.Scene({
                offset: wh*.5,
                duration: '300%',
                triggerElement: d,
            })
            .addIndicators({
                colorStart: "rgba(0,0,0,0.5)",
                colorEnd: "rgba(0,0,0,0.5)",
                colorTrigger : "rgba(0,0,0,1)",
                name:name
            })
            .setPin('#panel-text-2', {pushFollowers: false})
            .addTo(scrollController);

            var timeline = new TimelineLite()
                .to(irakliText, 1, { opacity: 0,
                    onComplete:function() {
                        irakliText.classList.add('hide');
                        anaText.classList.remove('hide');
                        irakliImage.classList.add('not-active')
                        anaImage.classList.remove('not-active')
                    }
                })
                .to(anaText, 1, { opacity: 1,
                     onReverseComplete:function() {
                        anaText.classList.add('hide');
                        irakliText.classList.remove('hide');
                        irakliImage.classList.remove('not-active')
                        anaImage.classList.add('not-active')
                    }
                });

            new ScrollMagic.Scene({
                offset: wh*.5,
                duration: '100%',
                triggerElement: d,
            })
            .addIndicators({
                colorStart: "rgba(0,0,0,0.5)",
                colorEnd: "rgba(0,0,0,0.5)",
                colorTrigger : "rgba(0,0,0,1)",
                name:name
            })
            .setTween(timeline)
            .addTo(scrollController);

            var timeline = new TimelineLite()
                .to(anaText, 1, { opacity: 0,
                    onComplete:function() {
                        anaText.classList.add('hide');
                        verikoText.classList.remove('hide');
                        anaImage.classList.add('not-active')
                        verikoImage.classList.remove('not-active')
                    }
                })
                .to(verikoText, 1, { opacity: 1,
                    onReverseComplete:function() {
                        verikoText.classList.add('hide');
                        anaText.classList.remove('hide');
                        verikoImage.classList.add('not-active')
                        anaImage.classList.remove('not-active')
                    }
                });

            new ScrollMagic.Scene({
                offset: wh*1.5,
                duration: '100%',
                triggerElement: d,
            })
            .addIndicators({
                colorStart: "rgba(0,0,0,0.5)",
                colorEnd: "rgba(0,0,0,0.5)",
                colorTrigger : "rgba(0,0,0,1)",
                name:name
            })
            .setTween(timeline)
            //.setClassToggle(verikoText, 'active')
            .addTo(scrollController);

            var timeline = new TimelineLite()
                .to(verikoText, 1, { opacity: 0,
                    onComplete:function() {
                        verikoText.classList.add('hide');
                        wrapText.classList.remove('hide');
                        irakliImage.classList.remove('not-active')
                        verikoImage.classList.remove('not-active')
                        anaImage.classList.remove('not-active')
                    }
                })
                .to(wrapText, 1, { opacity: 1 ,
                    onReverseComplete:function() {
                        wrapText.classList.add('hide');
                        verikoText.classList.remove('hide');
                        irakliImage.classList.add('not-active')
                        anaImage.classList.add('not-active')
                    }
                });

            new ScrollMagic.Scene({
                offset: wh*2.5,
                duration: '100%',
                triggerElement: d,
            })
            .addIndicators({
                colorStart: "rgba(0,0,0,0.5)",
                colorEnd: "rgba(0,0,0,0.5)",
                colorTrigger : "rgba(0,0,0,1)",
                name:name
            })
            .setTween(timeline)
            .addTo(scrollController);
        }
        else {
            d.querySelector('.text-wrapper').style.opacity = 1;
        }
    });

};

window.onload = onWindowLoaded;
