from django.conf import settings
from django.urls import include, path, re_path
from django.contrib import admin


urlpatterns = [
    path(
        settings.SMARTZ_API_PREFIX,
        include([
            path('constructors', include('apps.constructors.urls')),
            # path('accounts', include('apps.account.urls')),
            path('instances', include('apps.contracts.urls')),
        ])
    ),
    path('admin', admin.site.urls),
]

# if settings.DEBUG:
#     import debug_toolbar
#     urlpatterns = [
#         re_path(r'^__debug__/', include(debug_toolbar.urls)),
#     ] + urlpatterns
