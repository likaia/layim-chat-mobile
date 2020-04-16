window.onload = () => {
	
	//获取url上的参数
	function getQueryString(name) {
		var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
		var r = window.location.search.substr(1).match(reg);
		if(r != null) return unescape(r[2]);
		return null;
	}
	
	var initData = {};
//	var baseAddress = "http://172.16.0.110";
//	var baseWsAddress = "ws://172.16.0.110";
	var baseAddress = "http://localhost";
	var baseWsAddress = "ws://localhost";

	$.ajax({
		type: "get",
		url: baseAddress + '/im/person/info',
		data: {
			"openid": getQueryString("openid")
		},
		dataType: 'json',
		success: function(data) {

			if(data.code == 'success') {
				initData = data.data;

				initLayim(initData.data);
			}

		}
	});

	function initLayim(data) {
		layui.use('mobile', function() {
			var mobile = layui.mobile,
				layim = mobile.layim;

			console.log(initData, '是否为空44444444444')

			layim.config({
				//上传图片接口
				uploadImage: {
					//（返回的数据格式见下文）
					url: '/upload/image',
					type: '' //默认post
				},
				init: data
			});

			var websocket = null;
			// 打开一个 web socket
			if('WebSocket' in window) {
				websocket = new WebSocket(baseWsAddress + "/contactCustomerServiceHandler?id=" + data.mine.id);
			}
//			else if('MozWebSocket' in window) {
//				websocket = new MozWebSocket(baseWsAddress + "/Bank/webSocketServer");
//			} else {
//				websocket = new SockJS(baseAddress + "/sockjs/webSocketServer");
//			}

			// 监听发送消息
			layim.on('sendMessage', function(data) {
				// 接收消息人员信息
				var mine = data.mine; // 发送人的信息，
				var to = data.to; // 接收人的信息

				var paramMap = {
					username: mine.username,
					content: mine.content,
					avatar: mine.avatar,
					emit: 'chatMessage',
					sendPersonId: mine.id, // 发送人
					receivePersonId: to.id, // 接收人
				}

				// 保存消息
				$.ajax({
					type: "post",
					url: baseAddress + '/im/person/sendMessage',
					data: JSON.stringify(paramMap),
					contentType: 'application/json',
					dataType: 'json',
					success: function(data) {
						console.log('已发送消息：', data)
						if(data.code == 'success') {
							console.log('成功')
						}

					}
				});
				
			});

			//创建一个会话
			layim.chat({
				id: -1,
				// friend、group 等字符，如果是 group，则创建的是群聊
				type: 'friend'
			});
			
			websocket.onmessage = function(res) {
				console.log(data, '接收消息')
				
				var data = res.data;
				data = JSON.parse(data);

				if (data.emit === 'chatMessage') {

					// res.data 即你发送消息传递的数据（阅读：监听发送的消息）
					layim.getMessage({
						// 消息来源用户名
						username: data.username,
						// 消息来源用户头像
						avatar: data.avatar,
						// 消息的来源ID（如果是私聊，则是用户id，如果是群聊，则是群组id）
						id: -1,// data.sendPersonId
						// 聊天窗口来源类型，从发送消息传递的to里面获取 
						type: "friend",
						// 消息内容 
						content: data.content,
						// 消息id，可不传。除非你要对消息进行一些操作（如撤回）
						cid: 0,
						// 是否我发送的消息，如果为 true，则会显示在右方
						mine: false,
						// 消息的发送者 id（比如群组中的某个消息发送者），可用于自动解决浏览器多窗口时的一些问题
						fromid: -1,// data.sendPersonId
						// 服务端时间戳毫秒数。注意：如果你返回的是标准的 unix 时间戳，记得要 *1000
						// timestamp: 1467475443306
					});
				}
			};
			
			console.log('联系客服模式')

			//监听查看更多记录
			layim.on('chatlog', function(data) {
				console.log(data);
				layer.msg('do something');
			});

		});
	}

}