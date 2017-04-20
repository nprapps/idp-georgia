#!/usr/bin/env python
# _*_ coding:utf-8 _*_
"""
Example application views.

Note that `render_template` is wrapped with `make_response` in all application
routes. While not necessary for most Flask apps, it is required in the
App Template for static publishing.
"""

import logging
import oauth
import static
import os
import app_config
import parse_doc

from copydoc import CopyDoc
from flask import Flask, make_response, render_template, abort
from flask import redirect, url_for
from render_utils import make_context, smarty_filter, urlencode_filter
from render_utils import flatten_app_config
from werkzeug.debug import DebuggedApplication

app = Flask(__name__)
app.debug = app_config.DEBUG

app.add_template_filter(smarty_filter, name='smarty')
app.add_template_filter(urlencode_filter, name='urlencode')

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)


@app.route('/')
@oauth.oauth_required
def index():
    """
    Example view demonstrating rendering a simple HTML page.
    """
    # context = make_context()

    # return make_response(render_template('index.html', **context))
    return redirect(url_for('_episode', filename='irakli.html'))


@app.route('/static/')
def _static():
    """
    Render a mostly-static HTML page for experimenting
    """
    context = make_context()
    return make_response(render_template('static.html', **context))


@app.route('/copydoc/<string:filename>')
def _copydoc(filename):
    """
    Example view demonstrating rendering a simple HTML page.
    """
    key = filename.split('.')[0]
    if not os.path.exists('data/%s' % filename):
        abort(404)

    with open(app_config.EPISODE_DOCUMENTS[key]['path']) as f:
        html = f.read()

    doc = CopyDoc(html)
    context = {
        'doc': doc
    }

    return make_response(render_template('copydoc.html', **context))


@app.route('/<string:filename>')
def _episode(filename):
    """
    Example view demonstrating rendering a simple HTML page.
    """
    key = filename.split('.')[0]
    if not os.path.exists('data/%s' % filename):
        abort(404)

    with open(app_config.EPISODE_DOCUMENTS[key]['path']) as f:
        html = f.read()

    context = make_context()
    doc = CopyDoc(html)
    parsed_document = parse_doc.parse(doc)
    context.update(parsed_document)
    context.update({'episode': key,
                    'next': app_config.EPISODE_DOCUMENTS[key]['next']})
    return make_response(render_template('episode.html', **context))


app.register_blueprint(static.static)
app.register_blueprint(oauth.oauth)

# Enable Werkzeug debug pages
if app_config.DEBUG:
    wsgi_app = DebuggedApplication(app, evalex=False)
else:
    wsgi_app = app

# Catch attempts to run the app directly
if __name__ == '__main__':
    logging.error('Please Run "fab app" instead!')
