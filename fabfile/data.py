#!/usr/bin/env python
# _*_ coding:utf-8 _*_
"""
Commands that update or process the application data.
"""
import app_config

from fabric.api import task
from pymongo import MongoClient


@task(default=True)
def update():
    """
    Stub function for updating app-specific data.
    """
    pass


@task
def bootstrap_db():
    """
    Create mongodb
    """
    client = MongoClient(app_config.MONGODB_URL)
    database = client['idp-georgia']

    database.images.drop()
    database.images.create_index('date',
                                 expireAfterSeconds=app_config.DB_IMAGE_TTL)
