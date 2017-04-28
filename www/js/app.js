import imagesLoaded from 'imagesloaded';
import * as _ from 'underscore';
import URL from 'url-parse';

const LAZYLOAD_AHEAD = 1;
const AVAILABLE_EPISODES = ['index', 'irakli', 'ana', 'veriko'];
let scrollController = null;
let current_episode = null;
let internal_link = false;


// Returns true with the exception of iPhones with no playsinline support
Modernizr.addTest('iphonewoplaysinline', function () {
    return navigator.userAgent.match(/(iPhone|iPod)/g) ? ('playsInline' in document.createElement('video')) : true;
});

/*
 * Run on page load.
 */
var onWindowLoaded = function(e) {
    // Cache jQuery references
    if (Modernizr.touchevents) {
        console.log('touch device detected');
    }
    else {
        console.log('non-touch device');
    }

    parseUrl();
    // Check conditional logic for our customized intro
    checkConditionalLogic();
    adaptPageToSessionStatus();
    // Init scrollmagic controller
    initScroller();
    // Force first section load of assets
    lazyload_assets(document.querySelector(".section"), 0);
    // Setup Chartbeat last!
    ANALYTICS.setupChartbeat();
}

const parseUrl = function() {
    const url = new URL(window.location, window.location, true);
    let bits = url.pathname.split('/');
    if (bits) {
        current_episode = bits.slice(-1)[0].replace('.html','').toLowerCase();
        if (current_episode == 'index') {
            // Use Irakli as the default episode
            current_episode = 'irakli';
        }
    }
}

// CHECK CONDITIONAL LOGIC
const checkConditionalLogic = function() {
    const referrer = new URL(document.referrer, window.location, true);
    internal_link = _.find(AVAILABLE_EPISODES, function(e) {
        return referrer.pathname.indexOf(e) !== -1 ? true : false;
    })
}

// APPLY STATUS TO PAGE
const adaptPageToSessionStatus = function() {
    // add current episode class to the body
    document.body.classList.add(current_episode);
    // if coming from an internal link
    // move to the desired scroll position when coming from an internal link
    if (internal_link) {
        let anchor = document.getElementById("intro-custom");
        anchor.scrollIntoView(true);
        document.body.classList.add('ready');
    }
}

const initScroller = function() {
    scrollController = new ScrollMagic.Controller();

    // Intro Background Video pinning at page load
    var introScene = new ScrollMagic.Scene({
            duration: '100%'
        })
        .setPin('#title-bg-container', {pushFollowers: false})
        .addTo(scrollController);

    /*
        TODO since most of this is panel specific, we can probably
        take a lot of it out of the for loop
    */
    // Intro scroll navigation
    document.querySelectorAll('.panel-intro').forEach(function(d,i) {
        var innerText = d.querySelector('.text-wrapper');

        // Fade in and manually pin the episode titling in the last panel
        if (d.classList.contains('panel-pin')) {
            // Fade in episode titling
            var introScene = new ScrollMagic.Scene({
                    duration: '50%',
                    triggerElement: d
                })
                .setTween(innerText, { opacity: 1, ease: Power1.easeIn })
                .addTo(scrollController);

            // Pin episode titling, then unpin to correspond with natural scroll
            var introScene = new ScrollMagic.Scene({
                    duration: '50%',
                    triggerElement: d
                })
                .on('enter', function(e) {
                    innerText.classList.add('pinned');
                })
                .on('leave', function(e) {
                    innerText.classList.remove('pinned');
                })
                .addTo(scrollController);
        } else {
            // Fade in/out all text as it comes into view
            if (innerText) {
                var timeline = new TimelineLite()
                    .to(innerText, 1, { opacity: 1, ease: Power1.easeOut })
                    .to(innerText, 1, { opacity: 0, ease: Power1.easeIn });

                var scrollScene = new ScrollMagic.Scene({
                    duration: '100%',
                    triggerElement: d,
                })
                .setTween(timeline)
                .addTo(scrollController);
            }

            // First panel of intro text will fade out the intro background
            if (d.classList.contains('bg-fade-out')) {
                var bgScene = new ScrollMagic.Scene({
                        duration: '50%',
                        triggerElement: d
                    })
                    .setTween('#title-bg-container', { opacity: 0, ease: Power1.easeOut })
                    .addTo(scrollController);
            } else if (d.classList.contains('final-panel')) {
            // Final panel in the intro will fade in the episode poster
                var bgTimeline = new TimelineLite()
                    .to('#bg-container', 1, { opacity: 0, ease: Power1.easeOut })
                    .to('#bg-container', 1, { opacity: 1, ease: Power1.easeIn });

                var bgScene = new ScrollMagic.Scene({
                        duration: '100%',
                        triggerElement: d
                    })
                    .setTween(bgTimeline)
                    .on('end', function(e) {
                        let topNav = document.getElementById('episode-nav');
                        if (e.scrollDirection == 'REVERSE') {
                            topNav.classList.remove('active');
                        } else {
                            topNav.classList.add('active');
                        }
                    })
                    .addTo(scrollController);

                var introScene = new ScrollMagic.Scene({
                        duration: '150%',
                        triggerElement: d
                    })
                   .on('end', function(e) {
                        if (e.scrollDirection == 'REVERSE') {
                            document.querySelector('#bg-container').classList.remove('bg-end');
                        } else {
                            document.querySelector('#bg-container').classList.add('bg-end');
                        }
                    })
                    .addTo(scrollController);
            }
        }
    });

    // Section viewport tracking to lazyload assets
    document.querySelectorAll('.section').forEach(function(d,i) {
        var innerText = d.querySelector('.text-wrapper');

        var scrollScene = new ScrollMagic.Scene({
            duration: '100%',
            triggerElement: d
        })
        .on('enter', sectionEnter)
        .addTo(scrollController);
    });

    // Video viewport tracking to play and pause videos
    document.querySelectorAll('.video-wrapper').forEach(function(d,i) {
        // Initialize players and preload videos
        initVideo(d);

        var scrollScene = new ScrollMagic.Scene({
            duration: '100%',
            triggerElement: d
        })
        .on('enter', videoEnter)
        .on('leave', videoLeave)
        .addTo(scrollController);
    });

};

// VIDEO
const animateBodyOpacity = function(e) {
    if (!internal_link) {
        // If not coming from an internal links
        // having the video loaded allow us to
        // restore opacity on the body
        document.body.classList.add('ready');
    }
}

const initVideo = function(el) {
    let videoTag = null;
    const src = el.getAttribute("data-src");
    const poster = el.getAttribute("data-poster");
    const mime = el.getAttribute("data-mime");
    const width = el.getAttribute("data-width");
    const height = el.getAttribute("data-height");
    const loop = el.getAttribute("data-loop");
    const muted = el.getAttribute("data-muted");
    const autoplay = el.getAttribute("data-autoplay");
    const controls = el.getAttribute("data-controls");
    const preload = el.getAttribute("data-preload");
    const containerId = el.getAttribute("id");
    if (!el.classList.contains('loaded')) {
        videoTag = document.createElement('video');
        if (muted != null) {
            videoTag.setAttribute('muted','');
        }
        if (loop != null) {
            videoTag.setAttribute('loop','');
        }
        if (controls != null) {
            videoTag.setAttribute('controls','');
        }
        if (preload != null) {
            videoTag.setAttribute('preload', preload);
        }
        if (Modernizr.touchevents) {
            if (autoplay != null) {
                videoTag.setAttribute('autoplay','');
            }
            videoTag.setAttribute('playsinline','');
        }

        videoTag.setAttribute('poster',poster);
        videoTag.setAttribute('width',width);
        // Check if iPhone with no playsinline support
        if (Modernizr.iphonewoplaysinline) {
            let source = document.createElement('source');
            source.setAttribute('src',src);
            videoTag.append(source);
        }
        el.append(videoTag);
        // Check if intro video has loaded
        if (el.classList.contains('intro')) {
            videoTag.oncanplay = animateBodyOpacity;
            const sources = videoTag.querySelectorAll('source');
            if (sources.length !== 0) {
                var lastSource = sources[sources.length-1];
                lastSource.addEventListener('error', function() {
                    //TODO show error message?
                    animateBodyOpacity();
                });
            }
            else {
                animateBodyOpacity();
            }
        }
        el.classList.add('loaded');
    }
}

// IMAGES
const renderImage = function(imageWrapper) {
    const image = imageWrapper.getElementsByTagName('img')[0];
    const src = imageWrapper.getAttribute("data-src");
    var parts = src.split('.');
    var filenamePosition = parts.length - 2;
    var filenameExtension = parts.length - 1;
    if (parts[filenameExtension].toLowerCase() !== 'gif') {
        if (document.body.clientWidth > 800) {
            parts[filenamePosition] += '-s800-c80';
        } else {
            parts[filenamePosition] += '-s600-c70';
        }
    }
    const newSrc = parts.join('.');
    image.setAttribute("src", newSrc);
    imageWrapper.removeAttribute("data-src");
}

const lazyload_images = function(section) {
    const images = section.querySelectorAll(".image-wrapper[data-src], .embed-graphic[data-src]");
    const imagesArray = Array.prototype.slice.call(images);
    imagesArray.map(image => renderImage(image))
    if (imagesArray.length) {
        imagesLoaded(section, function() {
            imagesArray.map(image => image.classList.add('loaded'));
        })
    }

}

// Lazy loading of images
const lazyload_assets = function(section, stop) {
    stop = stop || 0;
    // Lazyload images
    lazyload_images(section);
    if (stop < LAZYLOAD_AHEAD && section.nextElementSibling) {
        lazyload_assets(section.nextElementSibling, stop + 1);
    }
}

// Scroll magic events
const sectionEnter = function(e) {
    lazyload_assets(this.triggerElement());
    this.remove();
}

const videoEnter = function(e) {
    console.log("videoEnter");
    if (!Modernizr.touchevents) {
        const el = this.triggerElement();
        if (el.classList.contains('loaded')) {
            let video = el.querySelector('video');
            if (video.getAttribute('controls') == null) {
                console.log('video does not have controls');
                video.play().catch((error) => {
                    // Ignore play errors using poster as fallback
                    console.log("error in playback", error);
                });
            } else {
                console.log('video has controls, ignore');
            }
        }
        else {
            console.error("video not loaded");
        }
    }
}

const videoLeave = function(e) {
    console.log("videoLeave");
    if (!Modernizr.touchevents) {
        const el = this.triggerElement();
        let video = el.querySelector('video');
        if (video.getAttribute('controls') == null) {
            console.log('video does not have controls');
            video.pause();
            video.currentTime = 0;
        } else {
            console.log('video has controls, ignore');
        }
    }
}

window.onload = onWindowLoaded;
