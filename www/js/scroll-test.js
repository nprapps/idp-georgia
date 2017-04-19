let scrollController = null;

var onWindowLoaded = function(e) {
    initScrollElements();
};

const initScrollElements = function() {
    scrollController = new ScrollMagic.Controller();

    //var textTween = TweenLite.to('#panel-text-1', 0.5, { opacity: 1 });
    document.querySelectorAll('.panel').forEach(function(d,i) {
        var innerText = d.querySelector('.text-wrapper');
        var timeline = new TimelineLite()
            .to(innerText, 1, { opacity: 1 })
            .to(innerText, 1, { opacity: 0 });

        new ScrollMagic.Scene({
            duration: '100%',
            triggerElement: d
        })
        .setTween(timeline)
        .addTo(scrollController);
    });
};

window.onload = onWindowLoaded;
