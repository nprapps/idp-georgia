#!/usr/bin/env python
# _*_ coding:utf-8 _*_
import app_config
import datetime
import logging
import requests
import shortcodes
from render_utils import make_context

from PIL import Image
from StringIO import StringIO
from functools import partial
from jinja2 import Environment, FileSystemLoader
from pymongo import MongoClient

IMAGE_URL_TEMPLATE = '%s/%s'
IMAGE_TYPES = ['image', 'graphic']
COLLAGE_TYPES = ['collage2']
SHORTCODE_DICT = {
    'image': {
        'caption': '',
        'width': '100%',
        'format': 'centered'
    },
    'collage2': {
        'caption': '',
        'width': '100%',
        'format': 'centered'
    },
    'asset-image': {
        'caption': '',
        'width': '100%',
        'format': 'centered'
    },
    'idpgraphic': {},
    'video': {},
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


def _get_collage_extra_context(pargs, tag):
    """
    Do some processing
    """
    extra = dict()
    if tag in COLLAGE_TYPES:
        extra.update(_get_collage_context(pargs))
    return extra


def _handler(context, content, pargs, kwargs, tag, defaults):
    """
    Default handler all other handlers inherit from.
    """
    if pargs:
        if tag in COLLAGE_TYPES:
            template_context = dict()
            extra_context = _get_collage_extra_context(pargs, tag)
            template_context.update(extra_context)
        else:
            id = _process_id(pargs[0], tag)
            template_context = dict(url=pargs[0],
                                    id=id)
            extra_context = _get_extra_context(id, tag)
            template_context.update(extra_context)
    else:
        template_context = dict()
        if tag == 'idpgraphic':
            template_context.update(make_context())
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
    # Replace rquote to normal quotation marks
    text = tag.get_text()
    text = text.replace(u'\xa0', u' ')
    text = text.replace(u'\u201D', u'"')
    text = text.replace(u'\u201C', u'"')
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

    client = MongoClient(app_config.MONGODB_URL)
    database = client['idp-georgia']
    collection = database.images
    result = collection.find_one({'_id': id})

    if not result:
        logger.info('image %s: uncached, downloading %s' % (id, url))
        response = requests.get(url)
        image = Image.open(StringIO(response.content))
        ratio = float(image.height) / float(image.width)
        collection.insert({
            '_id': id,
            'date': datetime.datetime.utcnow(),
            'ratio': ratio,
        })
    else:
        logger.info('image %s: retrieved from cache' % id)
        ratio = result['ratio']

    ratio = round(ratio * 100, 2)
    return dict(ratio=ratio, url=url)


def _get_collage_context(pargs):
    """
    Download image and get/cache aspect ratio.
    """
    ratios = {}
    for ix, id in enumerate(pargs):
        url = IMAGE_URL_TEMPLATE % (app_config.IMAGE_URL, id)
        ratios['url%s' % ix] = url
        client = MongoClient(app_config.MONGODB_URL)
        database = client['idp-georgia']
        collection = database.images
        result = collection.find_one({'_id': id})

        if not result:
            logger.info('image %s: uncached, downloading %s' % (id, url))
            response = requests.get(url)
            image = Image.open(StringIO(response.content))
            ratio = float(image.height) / float(image.width)
            collection.insert({
                '_id': id,
                'date': datetime.datetime.utcnow(),
                'ratio': ratio,
            })
        else:
            logger.info('image %s: retrieved from cache' % id)
            ratio = result['ratio']
        ratio = round(ratio * 100, 2)
        ratios['ratio%s' % ix] = ratio
    return ratios
