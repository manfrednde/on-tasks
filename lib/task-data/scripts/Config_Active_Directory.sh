#! /bin/csh
#Date : 2016/07/13

set Cmdhelp="Usage:\n\t$0 <BMC IP> <Username> <Password> -config-AD <enable/disable> <domainName> <timeOut> <domainAddress1> <domainAddress2> <domainAddress3>\n"

#Checking argv number
if ($#argv != 10)then
    echo "[ ERR ] command data is not legal."
    echo "$Cmdhelp"
    exit 128
endif

#Checking AD parameter
if($5 == "enable") then
    set AdEnable=1
else if($5 == "disable") then
    set AdEnable=0
else
    echo "[ ERR ] command data is not legal."
    echo "$Cmdhelp"
    exit 128
endif

set PROTOCAL = "https"
set WGET_OPTIONS = "--no-check-certificate"

# Get AD information
set BMCIP=$1
set USER=$2
set PASSWD=$3
set DomainName=$6
set TimeOut=$7
set DomainNameServer1=$8
set DomainNameServer2=$9
shift
set DomainNameServer3=$9

set x = `wget ${PROTOCAL}://$BMCIP/rpc/WEBSES/create.asp --post-data="WEBVAR_USERNAME=$USER&WEBVAR_PASSWORD=$PASSWD" ${WGET_OPTIONS} -qO- | grep SESSION_COOKIE | awk -F"'" '{print $4}'`
set SC = `echo $x | awk -F " " '{print $1}'`

set tmp = `wget ${PROTOCAL}://$BMCIP/rpc/setactivedircfg.asp --header "cookie: SessionCookie=$SC" --post-data "AD_ENABLE=$AdEnable&AD_DOMAINNAME=$DomainName&AD_TIMEOUT=$TimeOut&AD_DOMAINSRVR1=$DomainNameServer1&AD_DOMAINSRVR2=$DomainNameServer2&AD_DOMAINSRVR3=$DomainNameServer3" ${WGET_OPTIONS} -qO- | grep HAPI_STATUS | awk -F " "  '{print $1}' | awk -F ":" '{print $2}'`
if($tmp == 0) then
	echo "[ Info ] The AD settings are saved successfuly."
else if($tmp != 0) then
	echo "[ ERR ] It failed to configure AD Information. Please try it again."
endif

wget ${PROTOCAL}://$BMCIP/rpc/WEBSES/logout.asp --header "cookie: SessionCookie=$SC" ${WGET_OPTIONS} -qO /dev/null
