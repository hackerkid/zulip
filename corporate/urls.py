from typing import Any

from django.conf.urls import include
from django.urls import path
from django.views.generic import TemplateView

import corporate.views
from zerver.lib.rest import rest_dispatch

i18n_urlpatterns: Any = [
    # Zephyr/MIT
    path('zephyr/', TemplateView.as_view(template_name='corporate/zephyr.html')),
    path('zephyr-mirror/', TemplateView.as_view(template_name='corporate/zephyr-mirror.html')),

    path('jobs/', TemplateView.as_view(template_name='corporate/jobs.html')),

    # Billing
    path('billing/', corporate.views.billing_home, name='corporate.views.billing_home'),
    path('billing/create_customer_portal_session', corporate.views.create_customer_portal_session,
         name='corporate.views.create_customer_portal_session'),
    path('upgrade/', corporate.views.initial_upgrade, name='corporate.views.initial_upgrade'),
    path('upgrade/processing_status', corporate.views.upgrade_webhook_status_page, name='corporate.views.upgrade_webhook_status_page'),
    path('stripe/webhook/', corporate.views.stripe_webhook, name='corporate.views.stripe_webhook'),
]

v1_api_and_json_patterns = [
    path('billing/upgrade', rest_dispatch,
         {'POST': 'corporate.views.upgrade'}),
    path('billing/sponsorship', rest_dispatch,
         {'POST': 'corporate.views.sponsorship'}),
    path('billing/plan/change', rest_dispatch,
         {'POST': 'corporate.views.change_plan_status'}),
    path('billing/sources/change', rest_dispatch,
         {'POST': 'corporate.views.replace_payment_source'}),
    path('billing/session/start_card_update_session', rest_dispatch,
         {'POST': 'corporate.views.start_card_update_stripe_session'}),
    path('billing/session/status', rest_dispatch,
         {'GET': 'corporate.views.session_status'})
]

# Make a copy of i18n_urlpatterns so that they appear without prefix for English
urlpatterns = list(i18n_urlpatterns)

urlpatterns += [
    path('api/v1/', include(v1_api_and_json_patterns)),
    path('json/', include(v1_api_and_json_patterns)),
]
