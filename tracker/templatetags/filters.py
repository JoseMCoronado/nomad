from django import template

register = template.Library()


def proper_name(string):
    proper_string = "%s" % (string.title())
    return proper_string


register.filter("proper_name", proper_name)
