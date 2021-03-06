# Generated by Django 2.0.3 on 2018-08-20 13:12

import apps.dapps.models
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('dapps', '0010_auto_20180815_0253'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserDapp',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=apps.dapps.models.init_time)),
                ('title', models.CharField(max_length=200)),
                ('dapp', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='dapps.Dapp')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='dapp',
            name='users',
            field=models.ManyToManyField(related_name='dapps', through='dapps.UserDapp', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddIndex(
            model_name='userdapp',
            index=models.Index(fields=['dapp', 'user'], name='dapps_userd_dapp_id_9931cb_idx'),
        ),
    ]
