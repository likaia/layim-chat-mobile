	var baseAddress = "http://172.16.0.110";
	var baseWsAddress = "ws://172.16.0.110";
//	var baseAddress = "http://localhost";
//	var baseWsAddress = "ws://localhost";

window.onload = () => {

	//获取url上的参数
	function getQueryString(name) {
		var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
		var r = window.location.search.substr(1).match(reg);
		if(r != null) return unescape(r[2]);
		return null;
	}

	var initData = {};

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
				layim = mobile.layim,
				laytpl = layui.laytpl,
				$ = layui.jquery,
				laypage = layui.laypage;

			layim.config({
				// //上传图片接口
				// uploadImage: {
				// 	url: baseAddress + '/common/uploadImage',
				// 	type: 'post'
				// },

				tool: [{
					//工具别名
					alias: 'customImage',
					//工具名称
					title: '上传图片',
					//图标字体的unicode，可不填
					iconUnicode: '&#xe60d;',
					//图标字体的class类名
					iconClass: ''
				}],

				init: data
			});

			//监听自定义工具栏点击，以上述扩展的工具为例
			layim.on('tool(customImage)', function(insert, send, obj){ //事件中的tool为固定字符，而code则为过滤器，对应的是工具别名（alias）
				let fileHidden = document.createElement("input");
				fileHidden.type = "file";
				fileHidden.accept = "image/*";
				document.body.appendChild(fileHidden);
				fileHidden.click();
				fileHidden.addEventListener("change", function (e) {
					let myForm = new FormData();
					myForm.append('file', fileHidden.files[0]);
					fileHidden.remove();
					$.ajax({
						url: `${baseAddress}/common/uploadImage`,
						type: "POST",
						data: myForm,
						contentType: false,
						processData: false,
						success: function (res) {
							res = JSON.parse(res);
							if (res.code === 0) {
								insert(`img[${res.data.src}]`);
								send();
							}
						},
						error:function(data){
							console.log(data)
						}
					});
				});
			});

			let websocket = null;
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
						if(data.code == 'success') {

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

				var data = res.data;
				data = JSON.parse(data);

				if (data.emit === 'chatMessage') {

					// res.data 即你发送消息传递的数据（阅读：监听发送的消息）
					layim.getMessage({
						// 消息来源用户名
						username: data.username,
						// 消息来源用户头像
						avatar: data.avatar.indexOf(baseAddress) == -1 ? baseAddress + data.avatar : data.avatar,
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
						timestamp: data.timestamp != null ? new Date(data.timestamp) : new Date()
					});
				}
			};

			var sendId = data.mine.id,
				result = [];

			let isInSearch = false,
//				firstLoad = true,
				cacheHeight = 0,
				nowHeight = 0;

			let moreLog = document.querySelector(".layim-chat-main > .layim-chat-system > span"),
				chatMain = document.querySelector(".layim-chat-main"), // 容器元素
				listView = document.querySelector(".layim-chat-main > ul"); // 容器元素
				
			if (!moreLog) {
				$('.layim-chat-main').append('<div class="layim-chat-system"><span layim-event="chatLog"></span></div>');
				moreLog = document.querySelector(".layim-chat-main > .layim-chat-system > span")
			}
			
			$(moreLog).on("click", function () {
//				isInSearch = true;
//				console.log("点击了查找更多记录")
				search();
			})

//			if (firstLoad) {
//				firstLoad = false;
//				console.log("加载完成")

				let promiseAll = [];

				document.querySelectorAll("img.layui-layim-photos").forEach((item, index) => {
					promiseAll[index] = new Promise(resolve => {
						item.onload = function () {
							resolve()
						}
					})
				})

				// 所有图片加载完后在滚动到最底
				Promise.all(promiseAll).then(() => {
					setTimeout(() => {
						$(chatMain).scrollTop($(listView).outerHeight());
					}, 80)

					setTimeout(() => {
						// 触顶加载
						$(chatMain).on("scroll", function () {
							if (isInSearch) return;
							if ($(listView).offset().top > 64) {
//								console.log("触顶了", moreLog)
								$(moreLog).click();
							}
						})
					}, 160)
				})
//			}

			function search() {
				$.ajax({
					type: "get",
					url: baseAddress + "/im/person/chatRecord?sendId=" + sendId,
					data: {
						startNumber: $(listView).find('.layim-chat-li').length
					},
					async: false,
					dataType: "json",
					success: function(res) {
						isInSearch = false;
//						console.log(res, '返回的聊天记录')
						total = res.total;
						res.data.forEach(item => {
							result.unshift(item);
						})
//						console.log(result)
						let html = laytpl(LAY_tpl.value).render({
							data: result
						});
						$(html).prependTo(listView);

						cacheHeight = nowHeight; // 之前的高度存起来
						nowHeight = $(listView).outerHeight();// 获取现在的高度
						$(chatMain).scrollTop(nowHeight - cacheHeight)// 设置滚动位置
					}
				});
			}

			//监听查看更多记录
			layim.on('chatlog', function(data, ul) {
//				console.log(data, ul, '点击了更多聊天记录 ul 下的 layim-chat-li')
//				console.log(ul.find('.layim-chat-li').length )
//				layer.msg('do something');
   				search();
			});

		});
	}

}
