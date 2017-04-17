#!/usr/bin/env python
# _*_ coding:utf-8 _*_

from time import sleep, time
from fabric.api import execute, task

import app_config
import logging

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)


@task
def main(run_once=False):
    """
    Main loop
    """
    copy_start = 0

    if not app_config.LOAD_COPY_INTERVAL:
        logger.error('did not find LOAD_COPY_INTERVAL in app_config')
        exit()

    while True:
        now = time()
        if (now - copy_start) > app_config.LOAD_COPY_INTERVAL:
            copy_start = now
            logger.info('Update google drive assets')
            execute('text.update')
        sleep(1)
