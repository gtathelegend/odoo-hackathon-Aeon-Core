FROM odoo:17.0

USER root
COPY deploy/render/entrypoint.sh /usr/local/bin/assetflow-entrypoint.sh
RUN chmod +x /usr/local/bin/assetflow-entrypoint.sh

COPY assetflow_erp /mnt/extra-addons/assetflow_erp
COPY deploy/render/odoo.conf /etc/odoo/odoo.conf

USER odoo
ENTRYPOINT ["/usr/local/bin/assetflow-entrypoint.sh"]
