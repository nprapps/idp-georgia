import imagesLoaded from 'imagesloaded';
import * as _ from 'underscore';
import URL from 'url-parse';

const LAZYLOAD_AHEAD = 1;
const AVAILABLE_EPISODES = ['irakli', 'ana', 'veriko'];

let url = null;
let show_full_intro = true;
let seen_episodes = null;
let current_episode = null;
let scrollController = null;
// Support multiple Clappr player instances
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
    adaptPageToSessionStatus();
    addAppListeners();
    // Init scrollmagic controller
    initScroller();
    // Force first sections load of assets
    lazyload_assets(document.querySelector(".section"));
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

    // Allow localstorage to be wiped using refresh query param
    if (url.query.refresh) {
        STORAGE.deleteKey('idp-georgia-intro')
    }
}

// CHECK CONDITIONAL LOGIC
const checkConditionalLogic = function() {
    const seen_intro = STORAGE.get('idp-georgia-intro');
    if (seen_intro) {
        show_full_intro = false;
    }
}

// APPLY STATUS TO PAGE
const adaptPageToSessionStatus = function() {
    let container = null
    // add current episode class to the body
    document.body.classList.add(current_episode);
    if (show_full_intro) {
        // Remove .panel class from intro and hide
        container = document.getElementById('intro-common');
        container.classList.remove('hide');
    }
}

const initScroller = function() {
    scrollController = new ScrollMagic.Controller();
    var duration = show_full_intro ? '400%' : '100%';
    var introScene = new ScrollMagic.Scene({
            duration: duration
        })
        .setPin('#bg-container', {pushFollowers: false})
        .addTo(scrollController);

    document.querySelectorAll('.panel-intro').forEach(function(d,i) {
        var innerText = d.querySelector('.text-wrapper');
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

        if (d.classList.contains('final-panel')) {
            var bgTimeline = new TimelineLite()
                .to('#bg-container', 1, { opacity: 0, ease: Power1.easeOut })
                .to('#bg-container', 1, { opacity: 1, ease: Power1.easeIn });

            var bgScene = new ScrollMagic.Scene({
                    duration: '100%',
                    triggerElement: d
                })
                .setTween(bgTimeline)
                .on('end', introSceneLeave)
                .addTo(scrollController);
        }
    });

    // footer scrollmagic
    document.querySelectorAll('.panel-footer').forEach(function(d,i) {
        var innerText = d.querySelector('.text-wrapper');
        var timeline = new TimelineLite()
            .to(innerText, 1, { opacity: 1 })
            .to(innerText, 1, { opacity: 0 });

        var scrollScene = new ScrollMagic.Scene({
            duration: '100%',
            triggerElement: d
        })
        .setTween(timeline)
        .on('enter', footerSceneEnter)
        .addTo(scrollController);
    });

    // section image loading
    document.querySelectorAll('.section').forEach(function(d,i) {
        var innerText = d.querySelector('.text-wrapper');

        var scrollScene = new ScrollMagic.Scene({
            duration: '100%',
            triggerElement: d
        })
        .on('enter', sectionEnter)
        .addTo(scrollController);
    });

    // individual video loading
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
const initVideo = function(el) {
    let videoTag = null;
    const src = el.getAttribute("data-src");
    const poster = el.getAttribute("data-poster");
    const mime = el.getAttribute("data-mime");
    const width = el.getAttribute("data-width");
    const height = el.getAttribute("data-height");
    const containerId = el.getAttribute("id");
    if (!el.classList.contains('loaded')) {
        videoTag = document.createElement('video');
        videoTag.setAttribute('muted','');
        if (Modernizr.touchevents) {
            videoTag.setAttribute('autoplay','');
            videoTag.setAttribute('playsinline','');
        }
        videoTag.setAttribute('loop','');
        videoTag.setAttribute('poster',poster);
        videoTag.setAttribute('width',width);
        // Check if iPhone with no playsinline support
        if (Modernizr.iphonewoplaysinline) {
            let source = document.createElement('source');
            source.setAttribute('src',src);
            videoTag.append(source);
        }
        el.append(videoTag);
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

const introSceneLeave = function(e) {
    console.log("introSceneLeave");
    // hidden elements fire spurious scroll magic events
    // check if parent is hidden
    if (this.triggerElement().parentNode.classList.contains('hide')) {
        this.off('leave');
    }
    else if (e.scrollDirection == 'FORWARD') {
        // Mark intro as seen
        STORAGE.set('idp-georgia-intro',true);
    }
}

const footerSceneEnter = function(e) {
    console.log("footerSceneEnter");
    // hidden elements fire spurious scroll magic events
    if (this.triggerElement().classList.contains('hide')) {
        this.off('enter');
    }
    // Mark intro as seen
    if (e.scrollDirection == 'FORWARD') {
        if (!seen_episodes) {
            STORAGE.set('idp-georgia-episodes',[current_episode]);
        }
        else if (!_.contains(seen_episodes, current_episode)) {
            seen_episodes.push(current_episode)
            STORAGE.set('idp-georgia-episodes',seen_episodes);
        }
    }
}

const sectionEnter = function(e) {
    console.log("sectionEnter");
    lazyload_assets(this.triggerElement());
    this.remove();
}

const videoEnter = function(e) {
    console.log("videoEnter");
    if (!Modernizr.touchevents) {
        const el = this.triggerElement();
        if (el.classList.contains('loaded')) {
            let video = el.querySelector('video');
            video.play().catch((error) => {
                // Ignore play errors using poster as fallback
            });
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
        video.pause();
        video.currentTime = 0;
    }
}

// EVENT LISTENERS
const addAppListeners = function() {
    //document.getElementById('more_info').onclick = function(e){
        //let container = document.getElementById('intro-common');
        //container.classList.remove('hide');
        //scrollController.destroy(true);
        //window.scrollTo(0, 0);
        //initScroller();
        //return false;
    //}
}

window.onload = onWindowLoaded;
