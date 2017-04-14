#!/usr/bin/env python
# _*_ coding:utf-8 _*_
import app_config
import logging
import requests
import shortcodes

from PIL import Image
from StringIO import StringIO
from functools import partial
from jinja2 import Environment, FileSystemLoader

IMAGE_URL_TEMPLATE = '%s/%s'
IMAGE_TYPES = ['image', 'graphic']
SHORTCODE_DICT = {
    'youtube': {
        'start_time': 0
    },
    'image': {
        'caption': '',
        'credit': 'Image credit',
        'width': '100%'
    },
    'graphic': {
        'caption': 'Graphic caption',
        'credit': 'Graphic credit',
        'width': '100%'
    },
    'facebook': {},
    'npr_video': {},
}

env = Environment(loader=FileSystemLoader('templates/shortcodes'))

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)


def _process_id(url, tag):
    """
    Extract an ID from a url (or just return the URL).
    """
    if tag == 'tweet':
        parts = url.split('/')
        return parts[5]
    else:
        return url


def _get_extra_context(id, tag):
    """
    Do some processing
    """
    extra = dict()
    if tag in IMAGE_TYPES:
        extra.update(_get_image_context(id))
    return extra


def _handler(context, content, pargs, kwargs, tag, defaults):
    """
    Default handler all other handlers inherit from.
    """
    if pargs:
        id = _process_id(pargs[0], tag)
        template_context = dict(url=pargs[0],
                                id=id)
        extra_context = _get_extra_context(id, tag)
        template_context.update(extra_context)
    else:
        template_context = dict()
    template_context.update(defaults)
    template_context.update(kwargs)
    template = env.get_template('%s.html' % tag)
    output = template.render(**template_context)
    return output


"""
Register handlers
"""
parser = shortcodes.Parser()
for tag, defaults in SHORTCODE_DICT.items():
    tag_handler = partial(_handler, tag=tag, defaults=defaults)
    parser.register(tag_handler, tag)


def process_shortcode(tag):
    """
    Generates html from shortcode
    """
    # Replace unicode <br>
    text = tag.get_text().replace(u'\xa0', u' ')
    try:
        return parser.parse(text)
    except shortcodes.RenderingError as e:
        logger.error('Could not render short code in: "%s"' % text)
        logger.error('cause: %s' % e.__cause__)
        return ''


def _get_image_context(id):
    """
    Download image and get/cache aspect ratio.
    """
    url = IMAGE_URL_TEMPLATE % (app_config.IMAGE_URL, id)
    logger.info('image %s: downloading %s' % (id, url))
    response = requests.get(url)
    image = Image.open(StringIO(response.content))
    ratio = float(image.height) / float(image.width)
    ratio = round(ratio * 100, 2)
    return dict(ratio=ratio, url=url)
