import pymysql

pymysql.install_as_MySQLdb()

# ---------------------------------------------------------------------------
# XAMPP ships MariaDB 10.4.x but Django 5.x requires MariaDB 10.5+.
# The features used by this project are compatible with 10.4, so we patch
# the version check and the RETURNING clause to avoid startup errors.
# ---------------------------------------------------------------------------
from django.db.backends.mysql import base as _mysql_base
from django.db.backends.mysql import features as _mysql_features

# 1) Skip the version check
_original_check = _mysql_base.DatabaseWrapper.check_database_version_supported


def _patched_check(self):
    try:
        _original_check(self)
    except Exception:
        pass


_mysql_base.DatabaseWrapper.check_database_version_supported = _patched_check

# 2) Disable "can_return_columns_from_insert" so Django does not emit
#    the RETURNING clause which MariaDB 10.4 does not support.
_mysql_features.DatabaseFeatures.can_return_columns_from_insert = False
_mysql_features.DatabaseFeatures.can_return_rows_from_bulk_insert = False
