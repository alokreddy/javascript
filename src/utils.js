// steps to get the currently running async function in logs
let me = arguments.callee.toString();
    me = me.substr('async function '.length);
    me = me.substr(0, me.indexOf('('));
    console.log(me, ' is running...');
