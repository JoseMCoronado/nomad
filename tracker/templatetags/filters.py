from django import template

register = template.Library()


@register.filter
def proper_name(string):
    proper_string = "%s" % (string.title())
    return proper_string
