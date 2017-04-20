import imagesLoaded from 'imagesloaded';
import * as _ from 'underscore';
import URL from 'url-parse';

const READ_INTERVAL = 5000;
const WAIT_TO_ENSURE_SCROLLING_IS_DONE = 40;
const LAZYLOAD_AHEAD = 1;
const AVAILABLE_EPISODES = ['irakli', 'ana', 'veriko'];

let url = null;
let show_full_intro = true;
let show_custom_intro = true;
let show_footer = true;
let show_primary = true;
let seen_episodes = null;
let replay_action = 'full';
let current_episode = null;
let interval = null;
let lastScrollTop = window.pageYOffset;
let currentScrollTop = null;
let scrollController = null;

/*
 * Run on page load.
 */
var onWindowLoaded = function(e) {
    // Cache jQuery references
    if (Modernizr.touch) {
        console.log('touch device detected');
    }
    else {
        console.log('non-touch device');
    }
    // Test localstorage scenarios
    // STORAGE.set('idp-georgia-intro',false);
    // STORAGE.set('idp-georgia-episodes',['irakli', 'ana']);
    // STORAGE.deleteKey('idp-georgia-intro')
    // STORAGE.deleteKey('idp-georgia-episodes')
    parseUrl();
    // Check conditional logic for our customized intro
    checkConditionalLogic();
    adaptPageToUserStatus();
    addAppListeners();
    // Init intro scroll controller
    initIntroScroller();
    // interval = new Timer(setActiveIntroText, READ_INTERVAL)
    // interval.start();
    // Force first sections load of assets
    lazyload_assets(document.querySelector(".section"));
    //render();
    // Setup Chartbeat last!
    ANALYTICS.setupChartbeat();
}

const initIntroScroller = function() {
    scrollController = new ScrollMagic.Controller();

    document.querySelectorAll('.panel-intro').forEach(function(d,i) {
        var innerText = d.querySelector('.text-wrapper');
        var timeline = new TimelineLite()
            .to(innerText, 1, { opacity: 1 })
            .to(innerText, 1, { opacity: 0 });

        var scrollScene = new ScrollMagic.Scene({
            duration: '100%',
            triggerElement: d
        })
        .setTween(timeline)
        .addTo(scrollController);

        if (d.classList.contains('final-panel')) {
            var bgScene = new ScrollMagic.Scene({
                    duration: '100%',
                    offset: '50%',
                    triggerElement: d
                    //triggerHook: 'onLeave'
                })
                .setTween(document.querySelector('#bg-container'), 1, { opacity: 0 })
                .on('end', introSceneEnd)
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
        .on('start', footerSceneStart)
        .addTo(scrollController);
    });
};

const introSceneEnd = function(e) {
    // Mark intro as seen
    if (e.scrollDirection == 'FORWARD') {
        STORAGE.set('idp-georgia-intro',true);
    }
}

const footerSceneStart = function(e) {
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
        STORAGE.deleteKey('idp-georgia-episodes')
    }
}

// CHECK CONDITIONAL LOGIC
const checkConditionalLogic = function() {
    const seen_intro = STORAGE.get('idp-georgia-intro');
    seen_episodes = STORAGE.get('idp-georgia-episodes');
    console.log('seen_intro', seen_intro);
    console.log('seen_episodes', seen_episodes);

    if (seen_intro) {
        show_full_intro = false;
    }
    if (seen_episodes && seen_episodes.constructor === Array) {
        let unseen_episodes = _.difference(AVAILABLE_EPISODES, seen_episodes);
        if (_.isEmpty(unseen_episodes) || _.isEqual(unseen_episodes, [current_episode])) {
            show_footer = false;
        }
        if (_.contains(seen_episodes, APP_CONFIG.EPISODE_DOCUMENTS[current_episode]['next_primary'])) {
            show_primary = false;
        }
    }
}

const adaptPageToUserStatus = function() {
    let container = null
    if (!show_full_intro) {
        // Remove .panel class from intro and hide
        container = document.getElementById('intro-common');
        container.classList.add('hide');
    }

    if (show_footer) {
        // hide episode end
        container = document.getElementById('end');
        container.classList.add('hide');
        if (show_primary) {
            container = document.getElementById('secondary');
            container.classList.add('hide');
        } else {
            container = document.getElementById('primary');
            container.classList.add('hide');
        }
    } else {
        // hide footer
        let container = document.getElementById('footer');
        container.classList.add('hide');

    }

}

// LAZY-LOADING FUNCTIONALITY

const isElementInViewport = function(el) {
    // Adapted from http://stackoverflow.com/a/15203639/117014
    // Returns true if el is partially on the viewport
    var rect = el.getBoundingClientRect();
    var vWidth   = window.innerWidth || document.documentElement.clientWidth;
    var vHeight  = window.innerHeight || document.documentElement.clientHeight;

    // Track partial visibility
    if ((rect.top <= vHeight &&
         0 >= -rect.bottom) &&
        (rect.left <= vWidth  &&
         0 >= -rect.right)) {
            return true;
    }
    return false;
}

const renderImage = function(imageWrapper) {
    const image = imageWrapper.getElementsByTagName('img')[0];
    const src = imageWrapper.getAttribute("data-src");
    var parts = src.split('.');
    var filenamePosition = parts.length - 2;
    var filenameExtension = parts.length - 1;
    if (parts[filenameExtension].toLowerCase() !== 'gif') {
        if (document.body.clientWidth > 800) {
            parts[filenamePosition] += '-s750-c80';
        } else {
            parts[filenamePosition] += '-s600-c70';
        }
    }
    const newSrc = parts.join('.');
    image.setAttribute("src", newSrc);
    imageWrapper.removeAttribute("data-src");
}

const lazyload_videos = function(section) {
    // TODO
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

/* Lazy loading of images and tweets
 * We expect this page to get really long so it is needed
 * tweets are handled here since we need to use the widget library to load them
 */
const lazyload_assets = function(section, stop) {
    stop = stop || 0;
    // Lazyload images
    lazyload_images(section);
    // Lazyload videos
    lazyload_videos(section);

    if (stop < LAZYLOAD_AHEAD && section.nextElementSibling) {
        lazyload_assets(section.nextElementSibling, stop + 1);
    }
}

const checkSectionVisibility = function() {
    // Check section visibility and launch lazyloading
    const sections = document.querySelectorAll(".section");
    const sectionsArray = Array.prototype.slice.call(sections);
    sectionsArray.forEach(function(section, ix) {
        if (isElementInViewport(section)) {
            lazyload_assets(section)
        }
    });
}

const render = function(e) {
    currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    checkSectionVisibility();
    // Store scrollTop position
    lastScrollTop = currentScrollTop;
}

// Throttle scroll through underscore
const handler = _.throttle(render, WAIT_TO_ENSURE_SCROLLING_IS_DONE);

// EVENT LISTENERS
const addAppListeners = function() {
    // Listen to different window movement events
    if (window.addEventListener) {
        addEventListener('scroll', handler, false);
        addEventListener('resize', handler, false);
    }

    document.getElementById('more_info').onclick = function(e){
        let container = document.getElementById('intro-common');
        container.classList.remove('hide');
        scrollController.destroy(true);
        window.scrollTo(0, 0);
        initIntroScroller();
        return false;
    }
}

window.onload = onWindowLoaded;
