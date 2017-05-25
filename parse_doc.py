# _*_ coding:utf-8 _*_
import logging
import re
import app_config
from bs4 import BeautifulSoup
from shortcode import process_shortcode

logging.basicConfig(format=app_config.LOG_FORMAT)
logger = logging.getLogger(__name__)
logger.setLevel(app_config.LOG_LEVEL)

end_doc_regex = re.compile(ur'^\s*[Ee][Nn][Dd]\s*$',
                           re.UNICODE)

new_section_marker_regex = re.compile(ur'^\s*\+{50,}\s*$',
                                      re.UNICODE)
section_end_marker_regex = re.compile(ur'^\s*-{50,}\s*$',
                                      re.UNICODE)

frontmatter_marker_regex = re.compile(ur'^\s*-{3}\s*$',
                                      re.UNICODE)

extract_metadata_regex = re.compile(ur'^(.*?):(.*)$',
                                    re.UNICODE)

shortcode_regex = re.compile(ur'^\s*\[%\s*.*\s*%\]\s*$', re.UNICODE)


def is_section_marker(tag):
    """
    Checks for the beginning of a new section
    """
    text = tag.get_text()
    m = new_section_marker_regex.match(text)
    if m:
        return True
    else:
        return False


def is_section_end_marker(tag):
    """
    Checks for the beginning of a new section
    """
    text = tag.get_text()
    m = section_end_marker_regex.match(text)
    if m:
        return True
    else:
        return False


def process_headline(contents):
    logger.debug('--process_headline start--')
    headline = None
    for tag in contents:
        if tag.name == "h2":
            headline = tag.get_text()
        else:
            logger.warning('unexpected tag found: Ignore %s' % tag.get_text())
    if not headline:
        logger.error('Did not find headline on post. Contents: %s' % contents)
    return headline


def process_metadata(contents):
    logger.debug('--process_metadata start--')
    metadata = {}
    for tag in contents:
        text = tag.get_text()
        m = extract_metadata_regex.match(text)
        if m:
            key = m.group(1).strip().lower()
            value = m.group(2).strip().lower()
            metadata[key] = value
        else:
            logger.error('Could not parse metadata. Text: %s' % text)
    logger.debug("metadata: %s" % metadata)
    return metadata


def process_section_contents(contents):
    """
    Process episode copy content
    In particular parse and generate HTML from shortcodes
    """
    logger.debug('--process_post_contents start--')

    parsed = []
    for tag in contents:
        text = tag.get_text()
        m = shortcode_regex.match(text)
        if m:
            parsed.append(process_shortcode(tag))
        else:
            parsed.append(unicode(tag))
    episode_contents = ''.join(parsed)
    return episode_contents


def parse_raw_sections(raw_sections):
    """
    parse raw episodes into an array of section objects
    """

    # Divide each episode into its subparts
    # - Headline
    # - FrontMatter
    # - Contents
    sections = []
    for raw_section in raw_sections:
        section = {}
        marker_counter = 0
        section_raw_headline = []
        section_raw_metadata = []
        section_raw_contents = []
        for tag in raw_section:
            text = tag.get_text()
            m = frontmatter_marker_regex.match(text)
            if m:
                marker_counter += 1
            else:
                if (marker_counter == 0):
                    section_raw_headline.append(tag)
                elif (marker_counter == 1):
                    section_raw_metadata.append(tag)
                else:
                    section_raw_contents.append(tag)
        section[u'headline'] = process_headline(section_raw_headline)
        metadata = process_metadata(section_raw_metadata)
        for k, v in metadata.iteritems():
            section[k] = v
        section[u'contents'] = process_section_contents(section_raw_contents)
        sections.append(section)
    return sections


def split_sections(doc):
    """
    split the raw document into an array of raw sections
    """
    logger.debug('--split_sections start--')
    raw_sections = []
    raw_episode_contents = []
    ignore_orphan_text = True

    body = doc.soup.body
    for child in body.children:
        if is_section_marker(child):
            # Detected first post stop ignoring orphan text
            if ignore_orphan_text:
                ignore_orphan_text = False
        else:
            if ignore_orphan_text:
                continue
            elif is_section_end_marker(child):
                ignore_orphan_text = True
                raw_sections.append(raw_episode_contents)
                raw_episode_contents = []
            else:
                raw_episode_contents.append(child)
    return raw_sections


def find_section_id(sections, id):
    """
    Find the section with a given id
    """
    for idx, section in enumerate(sections):
        try:
            if section['id'] == id:
                return idx
        except KeyError:
            continue
    return None


def process_extracted_contents(inline_intro):
    """
    Remove html markup
    """
    return inline_intro['contents']


def parse(doc):
    """
    parse google doc files and extract markup
    """
    try:
        parsed_document = {}
        logger.info('-------------start------------')
        raw_sections = split_sections(doc)
        sections = parse_raw_sections(raw_sections)
        logger.info('Number of sections: %s' % len(sections))
        parsed_document['sections'] = sections
    finally:
        logger.info('-------------end------------')
    return parsed_document
