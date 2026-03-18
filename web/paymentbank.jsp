<%-- 
    Document   : paymentbank
    Created on : 18 Mar, 2026, 4:03:55 PM
    Author     : champ
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Payment Page</title>
    </head>
    <body>
        <%
        String item=request.getParameter("items");
        RequestDispatcher rd=request.getRequestDispatcher(item + ".jsp");
        
        rd.forward(request, response);
        %>
        <h1><%=item%></h1>
        
    </body>
</html>
