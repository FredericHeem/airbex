name             'awscli'
maintainer       'EJ Bensing'
maintainer_email 'ebensing@rm-dash-r.com'
license          'All rights reserved'
description      'Installs/Configures awscli'
long_description IO.read(File.join(File.dirname(__FILE__), 'README.md'))
version          '0.1.0'

depends 'python'

recipe 'awscli::default',   'Installs AWS CLI via PIP.'
