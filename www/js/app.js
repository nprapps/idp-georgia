import imagesLoaded from 'imagesloaded';
import * as _ from 'underscore';
import URL from 'url-parse';

const LAZYLOAD_AHEAD = 1;
const AVAILABLE_EPISODES = ['irakli', 'ana', 'veriko'];
let url = null;
let scrollController = null;
let current_episode = null;
let internal_link = false;
// Support multiple player instances
let players = {};


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
    adaptPageToReferrer();
    // Init intro background video
    initBackgroundVideo(document.querySelector('#intro-vid'));
    // Init scrollmagic controller
    initScroller();
    // Force first section load of assets
    lazyload_assets(document.querySelector(".section"), 0);
    addAppListeners();
    // Setup Chartbeat last!
    ANALYTICS.setupChartbeat();
}

const parseUrl = function() {
    url = new URL(window.location, window.location, true);
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
    // console.log("document.referrer:", document.referrer);
    if(document.referrer.indexOf('idp-georgia/') !== -1) {
        internal_link = true;
    }
    // Local tests
    // console.log(url.hostname);
    if (url.hostname == 'localhost' || url.hostname == '127.0.0.1') {
        let found = _.find(AVAILABLE_EPISODES, function(e) {
            return document.referrer.indexOf(e) !== -1 ? true : false;
        })
        if (found !== undefined) {
            internal_link = true;
        }
    }

    // check for device orientation
    checkOrientation();
}

const checkOrientation = function() {
    if (window.innerHeight >= window.innerWidth){
        console.log('portrait');
        if (!document.body.classList.contains('panel-portrait')) {
            document.body.classList.remove('panel-landscape');
            document.body.classList.add('panel-portrait');
        }
    } else {
        console.log('landscape');
        if (!document.body.classList.contains('panel-landscape')) {
            document.body.classList.remove('panel-portrait');
            document.body.classList.add('panel-landscape');
        }
    }
}

// APPLY STATUS TO PAGE
const adaptPageToReferrer = function() {
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
    scrollController = new ScrollMagic.Controller({refreshInterval: 0});
    /*
        TODO since most of this is panel specific, we can probably
        take a lot of it out of the for loop
    */
    // Intro scroll navigation
    _.each(document.querySelectorAll('.panel-intro'), function(d, i) {
        var innerText = d.querySelector('.text-wrapper');
        var assetWrapper = d.querySelector('.asset-wrapper');

        // Fade in and manually pin the episode titling in the last panel
        if (d.classList.contains('panel-pin')) {
            // Fade in episode titling
            var introScene = new ScrollMagic.Scene({
                    duration: '50%',
                    triggerElement: d
                })
                .setTween(innerText, { opacity: 1, ease: Power1.easeIn })
                .on('enter', function(e) {
                    innerText.classList.add('pinned');
                })
                .on('leave', function(e) {
                    innerText.classList.remove('pinned');
                })
                .on('end', function(e) {
                    if (e.scrollDirection == 'REVERSE') {
                        document.querySelector('#bg-container').classList.remove('bg-end');
                    } else {
                        document.querySelector('#bg-container').classList.add('bg-end');
                    }
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
                    .on('end', function(e) {
                        if (e.scrollDirection == 'REVERSE') {
                            document.querySelector('#title-bg-container').classList.add('bg-active');
                        } else {
                            document.querySelector('#title-bg-container').classList.remove('bg-active');
                        }
                    })
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
                    .on('start', function(e) {
                        if (e.scrollDirection == 'REVERSE') {
                            document.querySelector('#bg-container').classList.remove('bg-active');
                        } else {
                            document.querySelector('#bg-container').classList.add('bg-active');
                        }
                    })
                    .on('end', function(e) {
                        let topNav = document.getElementById('episode-nav');
                        if (e.scrollDirection == 'REVERSE') {
                            topNav.classList.remove('active');
                        } else {
                            topNav.classList.add('active');
                        }
                    })
                    .addTo(scrollController);

                var otherChars = assetWrapper.querySelectorAll('.char-wrapper:not(.char-' + current_episode + ')');
                var characterTransitionScene = new ScrollMagic.Scene({
                    offset: -window.innerHeight*.2,
                    duration: 0,
                    triggerElement: assetWrapper,
                    triggerHook: 'onLeave'
                })
                .setClassToggle(otherChars, 'not-active')
                .addTo(scrollController);
            }
        }
    });

    // Section viewport tracking to lazyload assets
    _.each(document.querySelectorAll('.section'), function(d,i) {
        var innerText = d.querySelector('.text-wrapper');

        var scrollScene = new ScrollMagic.Scene({
            duration: '100%',
            triggerElement: d
        })
        .on('enter', sectionEnter)
        .addTo(scrollController);
    });

    // Video viewport tracking to pause interview videos
    _.each(document.querySelectorAll('.video-interview'), function(d,i) {
        // Initialize players and preload videos
        initJWPlayerVideo(d);

        var scrollScene = new ScrollMagic.Scene({
            duration: '100%',
            triggerElement: d
        })
        .on('leave', videoInterviewLeave)
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

const createPlayerInstance = function(containerId, media, poster, width, ratio,
                                      muted, loop, controls, autoplay) {
    // Assign default values
    width = width || '100%';
    ratio = ratio || "16:9";
    muted = muted === null ? false : true;
    loop = loop === null ? false : true;
    controls = controls === null ? false : true;
    autoplay = autoplay === null ? false : true;
    const stretching = "fill";

    let player = jwplayer(containerId);
    player.setup({
        file: media,
        mediaid: "xxxxYYYY",
        image: poster,
        width: width,
        aspectratio: ratio,
        mute: muted,
        repeat: loop,
        controls: controls,
        stretching: stretching
    });

    return player
}

const initJWPlayerVideo = function(el) {
    const src = el.getAttribute("data-src");
    const poster = el.getAttribute("data-poster");
    const width = el.getAttribute("data-width");
    const ratio = el.getAttribute("data-ratio");
    const loop = el.getAttribute("data-loop");
    const muted = el.getAttribute("data-muted");
    const controls = el.getAttribute("data-controls");
    const preload = el.getAttribute("data-preload");
    let trackId = el.getAttribute("data-analytics");
    const containerId = el.getAttribute("id");
    if (!el.classList.contains('loaded')) {
        // JWPlayer managed video
        let videoDiv = document.createElement('div');
        if (trackId == null) {
            trackId = containerId+'-child';
        }
        videoDiv.setAttribute('id', trackId);
        el.appendChild(videoDiv);
        let player = createPlayerInstance(trackId, src, poster, width,
                                          ratio, muted, loop, controls);
        // ANALYTICS track if video has been played
        player.on('play', function(e) {
            ANALYTICS.trackEvent('video-play', player.id);
        })
        players[containerId] = player;

        // Finally mark the videoWrapper as loaded
        el.classList.add('loaded');
    }
}

const initBackgroundVideo = function(el) {
    let videoTag = null;
    const src = el.getAttribute("data-src");
    const poster = el.getAttribute("data-poster");
    const width = el.getAttribute("data-width");
    const loop = el.getAttribute("data-loop");
    const muted = el.getAttribute("data-muted");
    const autoplay = el.getAttribute("data-autoplay");
    const preload = el.getAttribute("data-preload");
    const containerId = el.getAttribute("id");
    if (!el.classList.contains('loaded')) {
        // HTML5 native video tag
        videoTag = document.createElement('video');
        if (muted != null) {
            videoTag.setAttribute('muted','');
            // Hack around muted on Firefox
            videoTag.muted = true;
        }
        if (loop != null) {
            videoTag.setAttribute('loop','');
        }
        if (preload != null) {
            videoTag.setAttribute('preload', preload);
        }
        videoTag.setAttribute('autoplay','');
        videoTag.setAttribute('playsinline','');
        videoTag.setAttribute('poster',poster);
        videoTag.setAttribute('width',width);
        // Check if iPhone with no playsinline support
        if (Modernizr.iphonewoplaysinline) {
            let source = document.createElement('source');
            source.setAttribute('src',src);
            videoTag.appendChild(source);
        }
        el.appendChild(videoTag);
        // Check if intro video has loaded
        if (el.classList.contains('video-intro')) {
            videoTag.setAttribute('data-object-fit','');
            objectFitPolyfill();
            videoTag.oncanplay = animateBodyOpacity;
            const sources = videoTag.querySelectorAll('source');
            if (sources.length !== 0) {
                var lastSource = sources[sources.length-1];
                lastSource.addEventListener('error', function() {
                    animateBodyOpacity();
                });
            }
            else {
                animateBodyOpacity();
            }
        }
        // Finally mark the videoWrapper as loaded
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
    const images = section.querySelectorAll(".image-wrapper[data-src]");
    const imagesArray = Array.prototype.slice.call(images);
    imagesArray.map(image => renderImage(image))
    if (imagesArray.length) {
        imagesLoaded(section, function() {
            imagesArray.map(image => image.classList.add('loaded'));
        })
    }

}

const lazyload_videos = function(section) {
    _.each(section.querySelectorAll(".video-wrapper[data-src]"), initBackgroundVideo);
}

// Lazy loading of images
const lazyload_assets = function(section, stop) {
    stop = stop || 0;
    // Lazyload images
    lazyload_images(section);
    lazyload_videos(section);
    if (stop < LAZYLOAD_AHEAD && section.nextElementSibling) {
        lazyload_assets(section.nextElementSibling, stop + 1);
    }
}

// Scroll magic events
const sectionEnter = function(e) {
    lazyload_assets(this.triggerElement());
    this.remove();
}

const videoInterviewLeave = function(e) {
    const el = this.triggerElement();
    const containerId = el.getAttribute("id");
    console.log("videoLeave", containerId);
    // Pause if it is an interview with controls
    if (el.classList.contains('jw')) {
        let player = players[containerId];
        player.pause(true);
    }
}

// EVENT LISTENERS
const toggleTopNavigation = function(e) {
    let nav = document.getElementById('episode-nav');
    if (nav.classList.contains('menu-visible')) {
        nav.classList.remove('menu-visible');
    } else {
        nav.classList.add('menu-visible');
    }
}

const addAppListeners = function() {
    let nav = document.querySelector('#nav-text').addEventListener('click', toggleTopNavigation);

    // Analytics
    document.querySelector(".utility-nav").addEventListener('click', function(e) {
        ANALYTICS.trackEvent('utility-nav-click');
    });
    document.querySelector(".menu").addEventListener('click', function(e) {
        ANALYTICS.trackEvent('menu-nav-click');
    });
    document.querySelector(".footer-question").addEventListener('click', function(e) {
        ANALYTICS.trackEvent('call-to-action-click');
    });

    let throttled = _.throttle(checkOrientation, 100);

    window.addEventListener("resize", throttled);
}

window.onload = onWindowLoaded;
