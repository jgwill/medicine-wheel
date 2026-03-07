for d in *;do cat $d/package.json|grep name|awk '{print $2}'|tr ',' ' '| tr '"' ' '; done

