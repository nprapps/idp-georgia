import imagesLoaded from 'imagesloaded';
import * as _ from 'underscore';
import URL from 'url-parse';

const READ_INTERVAL = 5000;
const WAIT_TO_ENSURE_SCROLLING_IS_DONE = 500;
const LAZYLOAD_AHEAD = 1;
let url = null;
let show_full_intro = true;
let show_custom_intro = true;
let replay_action = 'full';
let current_episode = 'irakli';
let interval = null;
let lastScrollTop = window.pageYOffset;
let currentScrollTop = null;

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
    addAppListeners();
    // interval = new Timer(setActiveIntroText, READ_INTERVAL)
    // interval.start();
    // Force first sections load of assets
    lazyload_assets(document.querySelector(".section"));
    //render();
    // Setup Chartbeat last!
    ANALYTICS.setupChartbeat();
}

// A simple wrapper for starting and clearing an interval
let Timer = function(callback, duration) {
    let intervalID;

    function start() {
        if (callback && duration) {
            intervalID = setInterval(callback, duration);
        }
    }

    function restart(newDuration) {
        duration = newDuration || duration;
        clearTimeout(intervalID);
        if (callback && duration) {
            intervalID = setInterval(callback, duration);
        }
    }

    function stop() {
        clearTimeout(intervalID);
    }

    return {
        start: start,
        restart: restart,
        stop: stop
    };
};

const parseUrl = function() {
    url = new URL(window.location);
    let bits = url.pathname.split('/');
    if (bits) {
        current_episode = bits.slice(-1)[0].replace('.html','');
    }
}

// CHECK CONDITIONAL LOGIC
const checkConditionalLogic = function() {

    const seen_intro = STORAGE.get('idp-georgia-intro');
    const seen_episodes = STORAGE.get('idp-georgia-episodes');
    if (seen_intro) {
        show_full_intro = false;
        document.body.classList.add('custom');
    }
    else {
        document.body.classList.add('intro');
    }
    if (seen_episodes) {
        console.log(seen_episodes);
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

const setActiveIntroText = function(scroll) {
    let selector = show_full_intro ? 'intro-common' : 'intro-custom';
    const intro = document.getElementById('intro');
    const active = intro.querySelector('.intro-item.active');
    if (active) {
        let next = active.nextElementSibling;
        if (next) {
            active.classList.remove('active');
            next.classList.add('active')
        } else {
            // If we were seeing the common intro
            // Move to custom intro
            if (document.body.classList.contains('intro')) {
                // Remove last common intro text
                active.classList.remove('active');
                // Introduction was seen store in local storage
                STORAGE.set('idp-georgia-intro',true);
                show_full_intro = false;
                document.body.classList.add('custom');
                document.body.classList.remove('intro');
                let item = document.getElementById('intro-custom').querySelector('.intro-item');
                item.classList.add('active');
            } else if (document.body.classList.contains('custom')) {
                // Remove last custom intro text
                active.classList.remove('active');
                document.body.classList.add(current_episode);
                document.body.classList.remove('custom');
                // Stop the interval
                interval.stop();
            }
        }
    } else {
        let item = document.getElementById(selector).querySelector('.intro-item');
        item.classList.add('active');
    }
    // TODO: check scroll direction and act accordingly
    if (scroll) {
        // Determine direction
        if (currentScrollTop >= lastScrollTop) {
            //Downward
            console.log('scroll downward');
        } else {
            //Upward
            console.log('scroll upward');
        }
    }
    else {
        // Fired by the interval, move downwards
        console.log('interval downward');
    }
}

const render = function(e) {
    currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    // Render page initially or after a scroll is detected
    if (document.body.classList.contains('intro')) {
        // Common Intro is active
        // use scroll to move between intro text
        // setActiveIntroText(true);
    } else if (document.body.classList.contains('custom')) {
        // Custom Intro is active
        // use scroll or to move between intro text
        // setActiveIntroText(true);
    } else {
        // We are inside the episode contents use scroll to lazyload assets
        // checkSectionVisibility();
    }
    checkSectionVisibility();
    // Store scrollTop position
    lastScrollTop = currentScrollTop;
}

// Throttle scroll through underscore
const handler = _.debounce(render, WAIT_TO_ENSURE_SCROLLING_IS_DONE);

// EVENT LISTENERS
const addAppListeners = function() {
    // Listen to different window movement events
    if (window.addEventListener) {
        addEventListener('DOMContentLoaded', handler, false);
        addEventListener('load', handler, false);
        addEventListener('scroll', handler, false);
        addEventListener('resize', handler, false);
    }
}

window.onload = onWindowLoaded;
