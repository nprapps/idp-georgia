import imagesLoaded from 'imagesloaded';
import * as _ from 'underscore';
import Clipboard from 'clipboard/lib/clipboard';

const DEBOUNCE_WAIT = 500;
const WAIT_TO_ENSURE_SCROLLING_IS_DONE = 40;
const LAZYLOAD_AHEAD = 0;

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
    addAppListeners();
    render();
    // Setup Chartbeat last!
    ANALYTICS.setupChartbeat();
}

const isElementInViewport = function(el, partial) {
    // Adapted from http://stackoverflow.com/a/15203639/117014
    //
    // Returns true only if the WHOLE element is in the viewport
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
    if (!isElementInViewport(imageWrapper)) return;
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
    imagesLoaded(imageWrapper, function() {
        imageWrapper.classList.add('loaded');
    });
}

const lazyload_assets = function(stop) {
    stop = stop || 0;

    // TODO check partial visibility
    const images = document.querySelectorAll(".embed-image[data-src], .embed-graphic[data-src]");
    const imagesArray = Array.prototype.slice.call(images);
    imagesArray.map(image => renderImage(image))
    if (stop < LAZYLOAD_AHEAD) {
        lazyload_assets(stop + 1);
    }
}

var render = function() {
    // TODO Should we use JST to create the common intro section??
    lazyload_assets();
}

const handler = _.throttle(render, WAIT_TO_ENSURE_SCROLLING_IS_DONE);

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
