# Generated by Django 2.0.3 on 2018-08-01 11:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('constructors', '0005_auto_20180703_1553'),
    ]

    operations = [
        migrations.AddField(
            model_name='constructor',
            name='image',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
    ]