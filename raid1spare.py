#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Скрипт следит за деградацией RAID1-массивов с автоматической подменой дисков на резервный

import subprocess
import shlex
import re
import smtplib
from email.mime.text import MIMEText

# входящие параметры

# от кого буд отправляться исходящие e-mail
me = 'script@mysmtp.ru'
# кому их отправлять
you = 'me@mysmtp.ru'
# сервер SMTP
smtp_server = 'smtp.mysmtp.ru'

# имя резервного диска
spare = 'sda5'

# инициализация глобальных переменных
namemd = {}
statemd = list()
sd = ''
sdn = ''
md = ''

# функция выполнения внешнего приложения с возвратом его вывода
def get_cmd_output(cmd):
    args = shlex.split(cmd)
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    res = p.communicate()[0]

    return res

# функция отсыла диагностических сообщений
def send_eml(txt):
    msg = MIMEText(txt)
    msg['Subject'] = 'The contents of '
    msg['From'] = me
    msg['To'] = you
    s = smtplib.SMTP(smtp_server)
    s.sendmail(me, [you], msg.as_string())
    s.quit()

# читаем из /proc/mdstat
res = get_cmd_output('cat /home/netmoose/!/mdstat')
# разбираем на ключевые слова результат
result = re.finditer( ur"(md\d+)|(sd.\d+)\[(\d+)\][\s\n]|\[([U_]+)\]", res )

# пробегаем по найденному и создаем список
for match in result :
  for group_index, group in enumerate( match.groups() ) :
    if group :
      if group.find('sd') and group.find('md') and len(group)==1 :
        sdn = group
        namemd[md][sdn] = dict({'name':sd,'state':''})
      elif group.find('sd') and group.find('md') :
        statemd = list(group)
        i = 0
        for st in statemd :
#           print "md: %s, i: %s, st: %s" % (md,i,st)
            namemd[md][str(i)]['state'] = st
            i += 1
      elif group.find('md') :
        sd = group
      else :
        namemd[group] = dict()
        md = group


# проходим по созданному выше списку и проверяем состояние дисков, в случае аварии удаляем старый из массива и добавляем резервный
for md in namemd:
  for sd in namemd[md].keys():
    if namemd[md][sd]['state'] == '_':
      try:
        fail = get_cmd_output("/sbin/mdadm /dev/%s -f /dev/%s" % (md,namemd[md][sd]['name']))
      except:
        send_eml(fail)
      finally:
        exit(0)
      try:
        remv = get_cmd_output("/sbin/mdadm /dev/%s -r /dev/%s" % (md,namemd[md][sd]['name']))
      except:
        send_eml(remv)
      finally:
        exit(0)
      try:
        newadd = get_cmd_output("/sbin/mdadm /dev/%s -a /dev/%s" % (md,spare))
      except:
        send_eml(newadd)
      finally:
        exit(0)
    else:
      send_eml("В массиве %s диск /dev/%s заменен на /dev/%s" % (md,namemd[md][sd]['name'],spare))
      exit(0)
