
namespace=jgwill-medicine-wheel
location=/workspace/repos/jgwill/medicine-wheel
_BACKUP_ROOT=/g/AUCAS
_BACKUP_FAST_TMP=/usr/local/tmp
if [ ! -d $_BACKUP_FAST_TMP ]; then
	sudo mkdir -p -m 777 $_BACKUP_FAST_TMP
fi

_BACKUP_TAR_FILEBASENAME=$namespace.$USER.$HOSTNAME.$(tlid min).tar
_BACKUP_TAR_FILENAME=$_BACKUP_FAST_TMP/$_BACKUP_TAR_FILEBASENAME


cd $location && \
	tar --exclude='node_modules' --exclude='.next'  -cf $_BACKUP_TAR_FILENAME . && \
	echo -n "Created backup file: $_BACKUP_TAR_FILENAME, gzipping it now so whatever you wanted todo in $(pwd) can start hapenning ;)...it will end up compressed into $_BACKUP_ROOT" && \
	gzip -f $_BACKUP_TAR_FILENAME && \
	mv $_BACKUP_TAR_FILENAME.gz $_BACKUP_ROOT && \
	echo "...Done! Backup file moved from fast storage:" && echo " $_BACKUP_TAR_FILENAME.gz " && echo "  to: $_BACKUP_ROOT/$_BACKUP_TAR_FILEBASENAME.gz" || echo "Something went wrong during backup, check the output above for more info"


	
