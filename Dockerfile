FROM archlinux
RUN pacman -Sy --noconfirm nodejs npm
COPY files /
RUN mkdir /resources
RUN ./install.sh
EXPOSE 54783

